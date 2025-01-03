import { TransformStream, WritableStream } from "node:stream/web";
import { LexerTokenType } from "./lexer.js";
import Piscina from "piscina";

/**
 * @import { StreamedTmphElementNode, TmphTextNode, TmphDoctypeDeclarationNode, StreamedTmphNode } from "./types.js";
 * @import {LexerToken} from './lexer.js';
 */

/**
 * @typedef {({
 *  filePath: string;
 *  rawHTMLString?: never;
 * } | {
 *  rawHTMLString: string;
 *  filePath?: never;
 * })} ParseTemplateParams
 */

const pool = new Piscina({
  filename: import.meta.resolve("./lexer.js"),
  name: "lex",
});

/**
 * @param {ParseTemplateParams} lexerParams
 * @param {ReadableStreamDefaultReader<LexerToken>} lexerTokenReader
 * @param {WritableStreamDefaultWriter<StreamedTmphNode>} parentChildStreamWriter - The parent node of the child nodes being parsed, or null if the child nodes are root-level.
 * @returns {Promise<null | string>} Final return value is the tag name of an encountered closing tag, or null if the tag is self-closing.
 */
async function parseChildNodes(
  lexerParams,
  lexerTokenReader,
  parentChildStreamWriter
) {
  /**
   * @type {ReadableStreamReadResult<LexerToken>}
   */
  let tokenReadResult;
  while (!(tokenReadResult = await lexerTokenReader.read()).done) {
    const token = tokenReadResult.value;
    switch (token.type) {
      case LexerTokenType.EOF: {
        return null;
      }
      case LexerTokenType.ERROR: {
        await parentChildStreamWriter.abort(
          new Error(
            `Tempeh parsing error: ${token.value} at ${
              lexerParams.filePath ? `${lexerParams.filePath}:` : ""
            }${token.l}:${token.c}`
          )
        );
        return null;
      }
      case LexerTokenType.TEXT_CONTENT: {
        if (!token.value) {
          break;
        }

        /**
         * @type {TmphTextNode}
         */
        const textNode = {
          textContent: token.value,
          l: token.l,
          c: token.c,
        };

        await parentChildStreamWriter.ready;
        await parentChildStreamWriter.write(textNode);
        break;
      }
      case LexerTokenType.OPENING_TAGNAME: {
        const tagName = token.value;

        /**
         * @type {StreamedTmphElementNode}
         */
        const elementNode = {
          tagName,
          c: token.c,
          l: token.l,
        };

        /**
         * @type {ReadableStreamReadResult<LexerToken>}
         */
        let openingTagTokenReadResult;
        let isElementClosed = false;
        while (
          !isElementClosed &&
          !(openingTagTokenReadResult = await lexerTokenReader.read()).done
        ) {
          const openingTagToken = openingTagTokenReadResult.value;

          switch (openingTagToken.type) {
            case LexerTokenType.SELF_CLOSING_TAG_END:
              await parentChildStreamWriter.ready;
              await parentChildStreamWriter.write(elementNode);
              isElementClosed = true;
              break;
            case LexerTokenType.ATTRIBUTE_NAME: {
              (elementNode.attributes ??= []).push({
                name: openingTagToken.value,
                l: openingTagToken.l,
                c: openingTagToken.c,
                value: "",
              });
              break;
            }
            case LexerTokenType.ATTRIBUTE_VALUE: {
              const lastAttribute = elementNode.attributes?.at(-1);
              if (lastAttribute) {
                lastAttribute.value = openingTagToken.value;
              } else {
                throw new Error(
                  `Tempeh parsing error: Encountered unexpected attribute value at ${
                    lexerParams.filePath ? `${lexerParams.filePath}:` : ""
                  }${openingTagToken.l}:${openingTagToken.c}`
                );
              }
              break;
            }
            case LexerTokenType.OPENING_TAG_END: {
              const { readable, writable } = new TransformStream();
              elementNode.childStream = readable;

              await parentChildStreamWriter.ready;
              await parentChildStreamWriter.write(elementNode);

              const childStreamWriter = writable.getWriter();
              const closingTagName = await parseChildNodes(
                lexerParams,
                lexerTokenReader,
                childStreamWriter
              );
              await childStreamWriter.close();

              isElementClosed = true;

              if (closingTagName !== tagName) {
                return closingTagName;
              }
              break;
            }
            case LexerTokenType.EOF: {
              return null;
            }
            case LexerTokenType.ERROR: {
              await parentChildStreamWriter.abort(
                new Error(
                  `Tempeh parsing error: ${token.value} at ${
                    lexerParams.filePath ? `${lexerParams.filePath}:` : ""
                  }${token.l}:${token.c}`
                )
              );
              return null;
            }
            default:
              const tokenTypeDisplayName =
                Object.entries(LexerTokenType).find(
                  ([key, value]) => value === openingTagToken.type
                )?.[0] ?? `UNKNOWN:${openingTagToken.type}`;
              throw new Error(
                `Tempeh parsing error: Encountered unexpected token type ${tokenTypeDisplayName} at ${
                  lexerParams.filePath ? `${lexerParams.filePath}:` : ""
                }${openingTagToken.l}:${openingTagToken.c}`
              );
          }
        }
        break;
      }
      case LexerTokenType.CLOSING_TAGNAME: {
        return token.value;
      }
      case LexerTokenType.DOCTYPE_DECLARATION: {
        await parentChildStreamWriter.ready;
        await parentChildStreamWriter.write(
          /** @satisfies {TmphDoctypeDeclarationNode} */ {
            doctypeDeclaration: token.value,
            l: token.l,
            c: token.c,
          }
        );
        break;
      }
      case LexerTokenType.COMMENT: {
        // Ignore comments
        break;
      }
      default: {
        const tokenTypeDisplayName =
          Object.entries(LexerTokenType).find(
            ([key, value]) => value === token.type
          )?.[0] ?? `UNKNOWN:${token.type}`;
        throw new Error(
          `Tempeh parsing error: Encountered unexpected token type ${tokenTypeDisplayName} at ${
            lexerParams.filePath ? `${lexerParams.filePath}:` : ""
          }${token.l}:${token.c}`
        );
      }
    }
  }

  return null;
}

/**
 * Takes the path to a .tmph.html file and parses it into a JSON object
 * that can be used by the compiler.
 * @param {ParseTemplateParams} lexerParams
 * @param {WritableStream<StreamedTmphNode>} rootNodeStream
 */
export default async function parseTemplate(lexerParams, rootNodeStream) {
  /**
   * @type {TransformStream<LexerToken>}
   */
  const lexerTokenTransformStream = new TransformStream();
  const runPromise = pool.run(
    { ...lexerParams, writableStream: lexerTokenTransformStream.writable },
    {
      // @ts-ignore
      transferList: [lexerTokenTransformStream.writable],
    }
  );

  const rootNodeStreamWriter = rootNodeStream.getWriter();

  try {
    await parseChildNodes(
      lexerParams,
      lexerTokenTransformStream.readable.getReader(),
      rootNodeStreamWriter
    );
  } finally {
    await rootNodeStreamWriter.close();
    await runPromise;
  }
}
