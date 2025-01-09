import { TransformStream, WritableStream } from "node:stream/web";
import { LexerTokenType } from "./lexer.js";
import Piscina from "piscina";

/**
 * @import { StreamedTmphElementNode, TmphTextNode, StreamedTmphNode, HTMLParserOptions, HTMLParserSource } from "./types.js";
 * @import { LexerToken } from './lexer.js';
 */

const pool = new Piscina({
  filename: import.meta.resolve("./lexer.js"),
  name: "lex",
});

/**
 * @param {HTMLParserSource} source
 * @param {HTMLParserOptions} parserOptions
 * @param {ReadableStreamDefaultReader<LexerToken>} lexerTokenReader
 * @param {WritableStreamDefaultWriter<StreamedTmphNode>} parentChildStreamWriter - The parent node of the child nodes being parsed, or null if the child nodes are root-level.
 * @param {string[]} [ parentTagNames ]
 * @returns {Promise<null | string>} Final return value is the tag name of an encountered closing tag, or null if the tag is self-closing.
 */
async function parseChildNodes(
  source,
  parserOptions,
  lexerTokenReader,
  parentChildStreamWriter,
  parentTagNames = []
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
        parentChildStreamWriter.abort(
          new Error(
            `Tempeh parsing error: ${token.value} at ${
              source.filePath ? `${source.filePath}:` : ""
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

        parentChildStreamWriter.write(textNode);
        break;
      }
      case LexerTokenType.OPENING_TAGNAME: {
        let tagName = token.value;
        switch (parserOptions.tagNameCasing) {
          case "lower":
            tagName = tagName.toLowerCase();
            break;
          case "upper":
            tagName = tagName.toUpperCase();
            break;
          default:
        }

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
              parentChildStreamWriter.write(elementNode);
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
                parentChildStreamWriter.abort(
                  new Error(
                    `Tempeh parsing error: Encountered unexpected attribute value ${
                      openingTagToken.value
                    } at ${source.filePath ? `${source.filePath}:` : ""}${
                      openingTagToken.l
                    }:${openingTagToken.c}`
                  )
                );
                return null;
              }
              break;
            }
            case LexerTokenType.OPENING_TAG_END: {
              const { readable, writable } = new TransformStream();
              elementNode.childStream = readable;

              parentChildStreamWriter.write(elementNode);

              const childStreamWriter = writable.getWriter();
              const closingTagName = await parseChildNodes(
                source,
                parserOptions,
                lexerTokenReader,
                childStreamWriter,
                parentTagNames.concat(tagName)
              );
              childStreamWriter.close();

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
              parentChildStreamWriter.abort(
                new Error(
                  `Tempeh parsing error: ${token.value} at ${
                    source.filePath ? `${source.filePath}:` : ""
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
              parentChildStreamWriter.abort(
                new Error(
                  `Tempeh parsing error: Encountered unexpected token type ${tokenTypeDisplayName} at ${
                    source.filePath ? `${source.filePath}:` : ""
                  }${openingTagToken.l}:${openingTagToken.c}`
                )
              );
              return null;
          }
        }
        break;
      }
      case LexerTokenType.CLOSING_TAGNAME: {
        let closingTagName = token.value;
        switch (parserOptions.tagNameCasing) {
          case "lower":
            closingTagName = closingTagName.toLowerCase();
            break;
          case "upper":
            closingTagName = closingTagName.toUpperCase();
            break;
          default:
        }

        for (let i = parentTagNames.length - 1; i >= 0; --i) {
          if (parentTagNames[i] === closingTagName) {
            // If the closing tag matches a parent tag name,
            // we should stop parsing child nodes and break out of this loop.
            // Return with the closing tag name so the parent
            // context can handle things further.
            return closingTagName;
          }
        }

        // If the closing tag doesn't match any parent tag names, ignore it
        break;
      }
      case LexerTokenType.DOCTYPE_DECLARATION: {
        parentChildStreamWriter.write(
          /** @satisfies {TmphDoctypeDeclarationNode} */ {
            doctypeDeclaration: token.value,
            l: token.l,
            c: token.c,
          }
        );
        break;
      }
      case LexerTokenType.COMMENT: {
        parentChildStreamWriter.write(
          /** @satisfies {TmphCommentNode} */ {
            comment: token.value,
            l: token.l,
            c: token.c,
          }
        );
        break;
      }
      default: {
        const tokenTypeDisplayName =
          Object.entries(LexerTokenType).find(
            ([key, value]) => value === token.type
          )?.[0] ?? `UNKNOWN:${token.type}`;
        parentChildStreamWriter.abort(
          new Error(
            `Tempeh parsing error: Encountered unexpected token type ${tokenTypeDisplayName} at ${
              source.filePath ? `${source.filePath}:` : ""
            }${token.l}:${token.c}`
          )
        );
        return null;
      }
    }
  }

  return null;
}

/**
 * Takes the path to a .tmph.html file and parses it into a JSON object
 * that can be used by the compiler.
 * @param {HTMLParserSource} source
 * @param {HTMLParserOptions} options
 * @param {WritableStream<StreamedTmphNode>} rootNodeStream
 */
export default async function parseTemplate(source, options, rootNodeStream) {
  /**
   * @type {TransformStream<LexerToken>}
   */
  const lexerTokenTransformStream = new TransformStream();
  const runPromise = pool.run(
    { source, options, writableStream: lexerTokenTransformStream.writable },
    {
      // @ts-ignore
      transferList: [lexerTokenTransformStream.writable],
    }
  );

  const rootNodeStreamWriter = rootNodeStream.getWriter();

  try {
    await parseChildNodes(
      source,
      options,
      lexerTokenTransformStream.readable.getReader(),
      rootNodeStreamWriter
    );
    await rootNodeStreamWriter.close();
  } catch (err) {
    await rootNodeStreamWriter.abort(err);
  } finally {
    await runPromise;
  }
}
