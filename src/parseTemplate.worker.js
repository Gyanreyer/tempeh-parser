import { LexerTokenType, lex } from "./lexer.js";

/**
 * @import { TmphElementNode, TmphTextNode, TmphDoctypeDeclarationNode, TmphNode } from "./templateData.js";
 */

/**
 * Takes the path to a .tmph.html file and parses it into a JSON object
 * that can be used by the compiler.
 * @param {Object} params
 * @param {string} params.filePath
 * @param {import("node:worker_threads").MessagePort} params.messagePort
 */
export default async function parseTemplate({ filePath, messagePort }) {
  /**
   * @type {Map<TmphElementNode, TmphElementNode | null>}
   */
  const nodeParentMap = new Map();

  /**
   * @type {TmphNode | null}
   */
  let currentOpenRootNode = null;

  /**
   * @type {TmphElementNode | null}
   */
  let currentOpenLeafElementNode = null;

  try {
    for await (const token of lex(filePath)) {
      switch (token.type) {
        case LexerTokenType.EOF: {
          if (currentOpenRootNode !== null) {
            if ("textContent" in currentOpenRootNode) {
              // Yield any trailing text node we may have.
              // We will just drop incomplete element nodes as things can get weird
              // and that matches how other HTML parsers behave.
              messagePort.postMessage(currentOpenRootNode);
            }
            currentOpenRootNode = currentOpenLeafElementNode = null;
          }
          messagePort.close();
          break;
        }
        case LexerTokenType.ERROR: {
          messagePort.postMessage(
            new Error(
              `Tempeh parsing error: ${token.value} at ${filePath}:${token.l}:${token.c}`
            )
          );
          continue;
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
          if (currentOpenLeafElementNode) {
            const previousNode = currentOpenLeafElementNode.children?.at(-1);
            if (previousNode && "textContent" in previousNode) {
              previousNode.textContent += textNode.textContent;
            } else {
              (currentOpenLeafElementNode.children ??= []).push(textNode);
            }
          } else if (
            currentOpenRootNode &&
            "textContent" in currentOpenRootNode
          ) {
            // Merge into the previous text node if it exists
            currentOpenRootNode.textContent += textNode.textContent;
          } else {
            currentOpenRootNode = textNode;
          }
          break;
        }
        case LexerTokenType.OPENING_TAGNAME: {
          /**
           * @type {TmphElementNode}
           */
          const elementNode = {
            tagName: token.value,
            l: token.l,
            c: token.c,
          };

          if (currentOpenRootNode && "textContent" in currentOpenRootNode) {
            messagePort.postMessage(currentOpenRootNode);
            currentOpenRootNode = null;
          }

          if (!currentOpenRootNode) {
            currentOpenRootNode = currentOpenLeafElementNode = elementNode;
            break;
          }

          if (!currentOpenLeafElementNode) {
            messagePort.postMessage(
              new Error(
                `Tempeh parsing error: Encountered unexpected opening tag "${token.value}" at ${filePath}:${token.l}:${token.c}`
              )
            );
            continue;
          }

          (currentOpenLeafElementNode.children ??= []).push(elementNode);
          nodeParentMap.set(elementNode, currentOpenLeafElementNode);
          currentOpenLeafElementNode = elementNode;
          break;
        }
        case LexerTokenType.ATTRIBUTE_NAME: {
          if (currentOpenLeafElementNode) {
            (currentOpenLeafElementNode.attributes ??= []).push({
              name: token.value,
              l: token.l,
              c: token.c,
              value: "",
            });
          }
          break;
        }
        case LexerTokenType.ATTRIBUTE_VALUE: {
          if (
            currentOpenLeafElementNode &&
            currentOpenLeafElementNode.attributes
          ) {
            const lastAttribute =
              currentOpenLeafElementNode.attributes[
                currentOpenLeafElementNode.attributes.length - 1
              ];
            if (lastAttribute) {
              lastAttribute.value = token.value;
            }
          }
          break;
        }
        case LexerTokenType.SELF_CLOSING_TAG_END: {
          if (!currentOpenLeafElementNode) {
            break;
          }

          if (currentOpenLeafElementNode === currentOpenRootNode) {
            messagePort.postMessage(currentOpenRootNode);
            currentOpenRootNode = currentOpenLeafElementNode = null;
          } else {
            /** @type {TmphElementNode | null} */
            const parentNode =
              nodeParentMap.get(currentOpenLeafElementNode) ?? null;
            nodeParentMap.delete(currentOpenLeafElementNode);

            currentOpenLeafElementNode = parentNode;
          }
          break;
        }
        case LexerTokenType.CLOSING_TAGNAME: {
          let closedTagname = token.value;

          if (!currentOpenLeafElementNode) {
            messagePort.postMessage(
              new Error(
                `Tempeh parsing error: Encountered unexpected closing tag "${closedTagname}" at ${filePath}:${token.l}:${token.c}`
              )
            );
            continue;
          }

          /**
           * @type {TmphElementNode | null}
           */
          let closedNode = currentOpenLeafElementNode;

          while (closedNode && closedNode.tagName !== closedTagname) {
            closedNode = nodeParentMap.get(closedNode) ?? null;
          }

          if (!closedNode) {
            messagePort.postMessage(
              new Error(
                `Tempeh parsing error: Encountered unexpected closing tag "${closedTagname}" at ${filePath}:${token.l}:${token.c}`
              )
            );
            continue;
          }

          if (closedNode === currentOpenRootNode) {
            messagePort.postMessage(closedNode);
            currentOpenRootNode = currentOpenLeafElementNode = null;
          } else {
            currentOpenLeafElementNode = nodeParentMap.get(closedNode) ?? null;
          }

          nodeParentMap.delete(closedNode);
          break;
        }
        case LexerTokenType.DOCTYPE_DECLARATION: {
          messagePort.postMessage(
            /** @satisfies {TmphDoctypeDeclarationNode} */ ({
              doctypeDeclaration: token.value,
              l: token.l,
              c: token.c,
            })
          );
        }
      }
    }
  } catch (error) {
    messagePort.postMessage(error);
  }
}
