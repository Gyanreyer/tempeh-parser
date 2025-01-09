import { open } from "node:fs/promises";

import {
  BACK_SLASH,
  FWD_SLASH,
  CLOSING_ANGLE_BRACKET,
  OPENING_ANGLE_BRACKET,
  isAttributeValueQuoteChar,
  isLegalAttributeNameChar,
  isLegalLeadingTagNameChar,
  isLegalTagNameChar,
  isLegalUnquotedAttributeValueChar,
  isLineBreak,
  isRawTextContentElementTagname,
  isScriptQuoteChar,
  isStyleQuoteChar,
  isVoidElementTagname,
  isWhitespace,
  EXCLAMATION_PT,
  HYPHEN,
  EQUALS,
  doCharCodesMatchDocType,
} from "./lexerUtils.js";

/**
 * @import { WritableStreamDefaultWriter } from 'node:stream/web';
 * @import { FileHandle } from 'node:fs/promises';
 * @import { HTMLParserOptions, HTMLParserSource } from './types.js';
 */

/**
 * Enum for lexer token types.
 * @readonly
 * @enum {typeof LexerTokenType[keyof typeof LexerTokenType]}
 */
export const LexerTokenType = Object.freeze({
  EOF: 0,
  ERROR: 1,
  TEXT_CONTENT: 2,
  OPENING_TAGNAME: 3,
  CLOSING_TAGNAME: 4,
  OPENING_TAG_END: 5,
  VOID_TAG_END: 6,
  SELF_CLOSING_TAG_END: 7,
  ATTRIBUTE_NAME: 8,
  ATTRIBUTE_VALUE: 9,
  COMMENT: 10,
  DOCTYPE_DECLARATION: 11,
});

/**
 * @typedef LexerTokenWithValue
 * @property {typeof LexerTokenType["ERROR"
 *  | "TEXT_CONTENT"
 *  | "OPENING_TAGNAME"
 *  | "OPENING_TAGNAME"
 *  | "CLOSING_TAGNAME"
 *  | "ATTRIBUTE_NAME"
 *  | "ATTRIBUTE_VALUE"
 *  | "COMMENT"
 *  | "DOCTYPE_DECLARATION"
 * ]} type
 * @property {string} value
 * @property {number} l - Line number
 * @property {number} c - Column number
 */

/**
 * @typedef LexerTokenWithNoValue
 * @property {typeof LexerTokenType["EOF" | "SELF_CLOSING_TAG_END" | "OPENING_TAG_END"]} type
 * @property {never} [value]
 * @property {number} l - Line number
 * @property {number} c - Column number
 */

/**
 * @template {keyof typeof LexerTokenType} [T=keyof typeof LexerTokenType]
 * @typedef {(LexerTokenWithValue | LexerTokenWithNoValue) & {
 *  type: typeof LexerTokenType[T]
 * }} LexerToken
 */

/**
 * @typedef {() => Promise<{
 *  ch: number;
 *  l: number;
 *  c: number;
 *  terminatorToken: LexerToken<"EOF" | "ERROR"> | null;
 * }>} PullCharFn

 * @typedef {() => undefined | LexerToken<"ERROR">} UnreadCharFn
 */

// A buffer size of 256 bytes offers a good balance between performance and memory usage.
// Increasing further can speed things up more by reducing how many I/O operations we need to perform
// over the course of parsing the file, but the returns get more and more diminishing as you go.
// NOTE: This needs to be a factor of 2 or things may break in weird ways.
// this can be set is 4 bytes, but the performance will be terrible. In extremely memory-constrained
// environments, 32 or 64 bytes will work fine.
const BUFFER_CHUNK_SIZE = 256;

/**
 * @param {{
 *  writableStream: WritableStream<LexerToken>;
 *  options: HTMLParserOptions;
 *  source: HTMLParserSource;
 * }} params
 */
export async function lex({ writableStream, options, source }) {
  // IIFE drives the lexer state machine and writes to the transform stream
  // until the input is exhausted or an error occurs.
  const streamWriter = writableStream.getWriter();

  /**
   * @type {FileHandle | null}
   */
  let fileHandle = null;

  let hasUnreadLastChar = false;
  /**
   * @type {number | null}
   */
  let lastReadCharCode = null;

  let line = 1;
  let lastReadCharLine = 1;

  let column = 0;
  let lastReadCharColumn = 0;

  /**
   * @type {DataView}
   */
  let charChunkBufferView;

  /**
   * @type {number}
   */
  let readableByteCount;

  if ("rawHTMLString" in source) {
    const utf8Encoder = new TextEncoder();
    const utf8Bytes = utf8Encoder.encode(source.rawHTMLString);
    charChunkBufferView = new DataView(utf8Bytes.buffer);
    readableByteCount = utf8Bytes.byteLength;
  } else {
    charChunkBufferView = new DataView(new ArrayBuffer(BUFFER_CHUNK_SIZE));
    readableByteCount = 0;
  }

  let nextReadOffset = 0;

  /**
   * @type {8 | 16 | 32}
   */
  let charByteSize = 8;
  let readOffsetIncrement = 1;

  /**
   * @param {number} readOffset
   */
  let readBufferedCharBytes = (readOffset) =>
    charChunkBufferView.getUint8(readOffset);

  /**
   * @returns {Promise<number | null | Error>} Returns the next character code point or null if EOF
   */
  const readNextChar = async () => {
    if (nextReadOffset < readableByteCount) {
      const readOffset = nextReadOffset;
      nextReadOffset += readOffsetIncrement;

      return readBufferedCharBytes(readOffset) || null;
    }

    if (!fileHandle) {
      return null;
    }

    try {
      const readResult = await fileHandle.read(charChunkBufferView);
      readableByteCount = readResult.bytesRead;
    } catch (err) {
      if (err instanceof Error) {
        return err;
      } else {
        return new Error(String(err));
      }
    }

    if (readableByteCount === 0) {
      return null;
    }

    nextReadOffset = 0;
    return readNextChar();
  };

  /**
   * @type {PullCharFn}
   */
  const pullChar = async () => {
    /**
     * @type {number}
     */
    let pulledCodePoint;

    if (hasUnreadLastChar && lastReadCharCode !== null) {
      // If we unread the last character, we'll just re-use it instead of reading a new one.
      hasUnreadLastChar = false;
      pulledCodePoint = lastReadCharCode;
    } else {
      const leadingCharByte = await readNextChar();
      if (leadingCharByte === null) {
        return {
          ch: -1,
          l: line,
          c: column,
          terminatorToken: {
            type: LexerTokenType.EOF,
            l: line,
            c: column,
          },
        };
      } else if (leadingCharByte instanceof Error) {
        return {
          ch: -1,
          l: line,
          c: column,
          terminatorToken: {
            type: LexerTokenType.ERROR,
            value: leadingCharByte.message,
            l: line,
            c: column,
          },
        };
      }

      if (charByteSize === 8) {
        // For utf-8, we need to perform special handling for multi-byte sequences
        if (leadingCharByte < 0x80) {
          // Single-byte characters are < 0x80
          pulledCodePoint = leadingCharByte;
        } else if (leadingCharByte >= 0xc0 && leadingCharByte <= 0xdf) {
          // 2-byte sequence
          const nextByte = await readNextChar();
          if (!nextByte) {
            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.EOF,
                l: line,
                c: column,
              },
            };
          } else if (nextByte instanceof Error) {
            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.ERROR,
                value: `An error occurred reading byte-order-marker bytes: ${nextByte.message}`,
                l: line,
                c: column,
              },
            };
          }

          pulledCodePoint = ((leadingCharByte & 0x1f) << 6) | (nextByte & 0x3f);
        } else if (leadingCharByte >= 0xe0 && leadingCharByte <= 0xef) {
          // 3-byte sequence
          const byte2 = await readNextChar();
          const byte3 = await readNextChar();

          if (!byte2 || !byte3) {
            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.EOF,
                l: line,
                c: column,
              },
            };
          } else if (byte2 instanceof Error || byte3 instanceof Error) {
            let errorMessage =
              "An error occurred reading byte-order-marker bytes:";
            if (byte3 instanceof Error) {
              errorMessage = `${errorMessage} ${byte3.message}`;
            } else if (byte2 instanceof Error) {
              errorMessage = `${errorMessage} ${byte2.message}`;
            } else {
              errorMessage = `${errorMessage} Unknown error reading next byte`;
            }

            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.ERROR,
                value:
                  byte2 instanceof Error
                    ? byte2.message
                    : byte3 instanceof Error
                    ? byte3.message
                    : "Unknown error reading next byte",
                l: line,
                c: column,
              },
            };
          }

          pulledCodePoint =
            ((leadingCharByte & 0x0f) << 12) |
            ((byte2 & 0x3f) << 6) |
            (byte3 & 0x3f);
        } else if (leadingCharByte >= 0xf0 && leadingCharByte <= 0xf7) {
          // 4-byte sequence
          const byte2 = await readNextChar();
          const byte3 = await readNextChar();
          const byte4 = await readNextChar();
          if (!byte2 || !byte3 || !byte4) {
            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.EOF,
                l: line,
                c: column,
              },
            };
          } else if (
            byte2 instanceof Error ||
            byte3 instanceof Error ||
            byte4 instanceof Error
          ) {
            let errorMessage =
              "An error occurred reading byte-order-marker bytes:";
            if (byte4 instanceof Error) {
              errorMessage = `${errorMessage} ${byte4.message}`;
            } else if (byte3 instanceof Error) {
              errorMessage = `${errorMessage} ${byte3.message}`;
            } else if (byte2 instanceof Error) {
              errorMessage = `${errorMessage} ${byte2.message}`;
            } else {
              errorMessage = `${errorMessage} Unknown error reading next byte`;
            }

            return {
              ch: -1,
              l: line,
              c: column,
              terminatorToken: {
                type: LexerTokenType.ERROR,
                value: errorMessage,
                l: line,
                c: column,
              },
            };
          }
          pulledCodePoint =
            ((leadingCharByte & 0x07) << 18) |
            ((byte2 & 0x3f) << 12) |
            ((byte3 & 0x3f) << 6) |
            (byte4 & 0x3f);
        } else {
          return {
            ch: -1,
            l: line,
            c: column,
            terminatorToken: {
              type: LexerTokenType.ERROR,
              value: `Invalid UTF-8 leading byte: ${leadingCharByte}`,
              l: line,
              c: column,
            },
          };
        }
      } else {
        // utf-16 also uses variable-width encoding, but it will just work itself out
        // if we just read each half of the character separately; utf-32 is fixed-width
        pulledCodePoint = leadingCharByte;
      }
    }

    lastReadCharLine = line;
    lastReadCharColumn = column;

    lastReadCharCode = pulledCodePoint;

    if (isLineBreak(pulledCodePoint)) {
      ++line;
      column = 0;
      return {
        ch: pulledCodePoint,
        l: line,
        c: column + 1,
        terminatorToken: null,
      };
    }

    return {
      ch: pulledCodePoint,
      l: line,
      c: ++column,
      terminatorToken: null,
    };
  };

  /**
   * @type {UnreadCharFn}
   */
  const unreadChar = () => {
    if (!hasUnreadLastChar) {
      line = lastReadCharLine;
      column = lastReadCharColumn;
      hasUnreadLastChar = true;
    } else {
      return {
        type: LexerTokenType.ERROR,
        value: "Cannot unread a character that has not been read",
        l: line,
        c: column,
      };
    }
  };

  /**
   * @type {LexerStateFunction<keyof typeof LexerTokenType, any> | null}
   */
  let nextStateFunction = lexTextContent;

  try {
    if ("filePath" in source) {
      fileHandle = await open(source.filePath, "r");

      const initialReadResult = await fileHandle.read(charChunkBufferView);
      readableByteCount = initialReadResult.bytesRead;

      if (readableByteCount >= 4) {
        const bomBytes = [
          charChunkBufferView.getUint8(0),
          charChunkBufferView.getUint8(1),
          charChunkBufferView.getUint8(2),
          charChunkBufferView.getUint8(3),
        ];

        if (
          bomBytes[0] === 0xef &&
          bomBytes[1] === 0xbb &&
          bomBytes[2] === 0xbf
        ) {
          // This is just a UTF-8 BOM; we can keep reading like normal, just skip those initial 3 bytes
          nextReadOffset = 3;
          // Leave charByteSize and readBufferedCharBytes as their 8-bit defaults
        } else if (bomBytes[0] === 0xfe && bomBytes[1] === 0xff) {
          // UTF-16 big endian
          charByteSize = 16;
          nextReadOffset = 2;
          readBufferedCharBytes = (readOffset) =>
            // Call getUint16 with the little endian flag set to false
            charChunkBufferView.getUint16(readOffset, false);
        } else if (bomBytes[0] === 0xff && bomBytes[1] === 0xfe) {
          // Little endian!
          if (bomBytes[2] === 0 && bomBytes[3] === 0) {
            // UTF-32 little endian
            charByteSize = 32;
            nextReadOffset = 4;
            readBufferedCharBytes = (readOffset) =>
              // Call getUint32 with the little endian flag set to true
              charChunkBufferView.getUint32(readOffset, true);
          } else {
            // UTF-16 little endian
            charByteSize = 16;
            nextReadOffset = 2;
            readBufferedCharBytes = (readOffset) =>
              // Call getUint16 with the little endian flag set to true
              charChunkBufferView.getUint16(readOffset, true);
          }
        } else if (
          bomBytes[0] === 0 &&
          bomBytes[1] === 0 &&
          bomBytes[2] === 0xfe &&
          bomBytes[3] === 0xff
        ) {
          // UTF-32 big endian
          charByteSize = 32;
          nextReadOffset = 4;
          readBufferedCharBytes = (readOffset) =>
            // Call getUint32 with the little endian flag set to false
            charChunkBufferView.getUint32(readOffset, false);
        }
      }

      readOffsetIncrement = charByteSize >> 3;
    }

    while (nextStateFunction) {
      nextStateFunction = await nextStateFunction(
        streamWriter,
        pullChar,
        unreadChar,
        options
      );
    }
    await streamWriter.close();
  } catch (err) {
    await streamWriter.abort(
      err instanceof Error ? err : new Error(String(err))
    );
  } finally {
    // Ensure we clean up the file handle even if the loop is broken out of
    await fileHandle?.close();
    streamWriter.releaseLock();
  }
}

/**
 * @template {keyof typeof LexerTokenType} T
 * @template {LexerStateFunction<any,any,any>|null} TNextStateFunction
 * @template {HTMLParserOptions} [TOptions=HTMLParserOptions]
 * @typedef {(
 *  streamWriter: WritableStreamDefaultWriter<LexerToken<T>>,
 *  pullChar: PullCharFn,
 *  unreadChar: UnreadCharFn,
 *  options: TOptions,
 * ) => Promise<TNextStateFunction | null>} LexerStateFunction
 */

/**
 * @type {LexerStateFunction<
 *  | "TEXT_CONTENT"
 *  | "DOCTYPE_DECLARATION"
 *  | "EOF"
 *  | "ERROR",
 *  | typeof lexOpeningTagContents
 *  | typeof lexClosingTagName
 *  | typeof lexCommentTag
 *  | typeof lexTextContent
 *  >}
 */
async function lexTextContent(streamWriter, pullChar, unreadChar) {
  /**
   * @type {number|undefined}
   */
  let startLine;
  /**
   * @type {number|undefined}
   */
  let startColumn;

  /**
   * @type {number[]}
   */
  const textContentCodes = [];

  /**
   * @type {number|undefined}
   */
  let prevLine;
  /**
   * @type {number|undefined}
   */
  let prevColumn;

  while (true) {
    let {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (terminatorToken) {
      if (terminatorToken.type === LexerTokenType.EOF) {
        // If we have any text content buffered, yield it as a final token before EOF
        streamWriter.write({
          type: LexerTokenType.TEXT_CONTENT,
          value: String.fromCodePoint(...textContentCodes),
          l: startLine,
          c: startColumn,
        });
      }
      streamWriter.write(terminatorToken);
      return null;
    }

    const textContentLength = textContentCodes.length;

    if (isLegalLeadingTagNameChar(nextCharCode)) {
      if (
        textContentLength > 0 &&
        textContentCodes[textContentLength - 1] === OPENING_ANGLE_BRACKET
      ) {
        // Splice off the "<" character we buffered before the tag name
        --textContentCodes.length;

        const unreadErrToken = unreadChar();
        if (unreadErrToken) {
          streamWriter.write(unreadErrToken);
          return null;
        }

        streamWriter.write({
          type: LexerTokenType.TEXT_CONTENT,
          value: String.fromCodePoint(...textContentCodes),
          l: startLine,
          c: startColumn,
        });
        return lexOpeningTagContents;
      } else if (
        textContentLength >= 2 &&
        // Test that the last 2 characters are "</"
        textContentCodes[textContentLength - 2] === OPENING_ANGLE_BRACKET &&
        textContentCodes[textContentLength - 1] === FWD_SLASH
      ) {
        textContentCodes.length -= 2;

        const unreadErrToken = unreadChar();
        if (unreadErrToken) {
          streamWriter.write(unreadErrToken);
          return null;
        }

        streamWriter.write({
          type: LexerTokenType.TEXT_CONTENT,
          value: String.fromCodePoint(...textContentCodes),
          l: startLine,
          c: startColumn,
        });
        return lexClosingTagName;
      }
    } else if (nextCharCode === HYPHEN) {
      // Test if we're starting a comment tag
      if (
        textContentLength >= 3 &&
        // If the last 3 characters are "<!-" and the next char is "-", we've got a comment tag
        textContentCodes[textContentLength - 3] === OPENING_ANGLE_BRACKET &&
        textContentCodes[textContentLength - 2] === EXCLAMATION_PT &&
        textContentCodes[textContentLength - 1] === HYPHEN
      ) {
        textContentCodes.length -= 3;
        streamWriter.write({
          type: LexerTokenType.TEXT_CONTENT,
          value: String.fromCodePoint(...textContentCodes),
          l: startLine,
          c: startColumn,
        });
        return lexCommentTag;
      }
    } else if (isWhitespace(nextCharCode)) {
      // Test if we're in a <!DOCTYPE declaration
      if (
        textContentLength >= 9 &&
        doCharCodesMatchDocType(textContentCodes.slice(-9))
      ) {
        // Shave off the "<!DOCTYPE" part of the string
        textContentCodes.length -= 9;

        streamWriter.write({
          type: LexerTokenType.TEXT_CONTENT,
          value: String.fromCodePoint(...textContentCodes),
          l: startLine,
          c: startColumn,
        });
        await lexDoctypeDeclaration(
          pullChar,
          streamWriter,
          // Use the previous line and column in case our whitespace
          // is a line break which could result in an incorrectly
          // reported line and column number for where the <!DOCTYPE> tag started
          prevLine ?? 1,
          (prevColumn ?? 9) - 8
        );
        return lexTextContent;
      }
    }

    textContentCodes.push(nextCharCode);
    prevLine = nextLine;
    prevColumn = nextCol;
  }
}

/**
 * Read the tag name at the start of an opening tag's contents.
 * @param {PullCharFn} pullChar
 * @param {UnreadCharFn} unreadChar
 * @return {Promise<LexerToken<"OPENING_TAGNAME"|"EOF"|"ERROR">>}
 */
async function readOpeningTagName(pullChar, unreadChar) {
  /**
   * @type {number[]}
   */
  const tagnameCodePointString = [];

  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      return terminatorToken;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (isLegalTagNameChar(nextCharCode)) {
      tagnameCodePointString.push(nextCharCode);
    } else {
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        return unreadErrToken;
      }

      return {
        type: LexerTokenType.OPENING_TAGNAME,
        value: String.fromCodePoint(...tagnameCodePointString),
        l: startLine,
        c: startColumn,
      };
    }
  }
}

/**
 * @type {LexerStateFunction<
 *   "OPENING_TAGNAME"|"ATTRIBUTE_NAME"|"ATTRIBUTE_VALUE"|"TEXT_CONTENT"|"SELF_CLOSING_TAG_END"|"OPENING_TAG_END"|"CLOSING_TAGNAME"|"EOF"|"ERROR",
 *   typeof lexTextContent | typeof lexClosingTagEnd
 * >}
 */
async function lexOpeningTagContents(
  streamWriter,
  pullChar,
  unreadChar,
  options
) {
  /**
   * @type {number|null}
   */
  let prevCharCode = null;

  const openingTagNameToken = await readOpeningTagName(pullChar, unreadChar);
  streamWriter.write(openingTagNameToken);

  if (openingTagNameToken.type !== LexerTokenType.OPENING_TAGNAME) {
    return null;
  }

  const tagName = openingTagNameToken.value;
  const isVoidTag = isVoidElementTagname(tagName);

  // Start a loop to lex attributes until we hit the end of the tag
  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (!isWhitespace(nextCharCode)) {
      // We hit the end of the opening tag! Now we need to figure out what to do next.
      if (nextCharCode === CLOSING_ANGLE_BRACKET) {
        // If this is a void tag or the tag was terminated with "/>", consider it a
        // self-closing tag with no content.
        if (
          isVoidTag ||
          (!options.ignoreSelfClosingSyntax && prevCharCode === FWD_SLASH)
        ) {
          streamWriter.write({
            type: LexerTokenType.SELF_CLOSING_TAG_END,
            l: nextLine,
            c: nextCol,
          });
          // Transition to lexing text content after the tag
          return lexTextContent;
        }

        streamWriter.write({
          type: LexerTokenType.OPENING_TAG_END,
          l: nextLine,
          c: nextCol,
        });

        // If this is a raw text content element,
        // we need to read the raw content inside the element.
        if (isRawTextContentElementTagname(tagName)) {
          return lexRawElementContent(streamWriter, pullChar, unreadChar, {
            ...options,
            tagName,
          });
        }

        // This is just the end of the opening tag, we don't have any tokens to emit.
        // So just start lexing the text content inside the element
        return lexTextContent;
      } else if (isLegalAttributeNameChar(nextCharCode)) {
        // We just hit the start of an attribute name. Unread the first char so the next lexer can use it.
        const unreadErrToken = unreadChar();
        if (unreadErrToken) {
          streamWriter.write(unreadErrToken);
          return null;
        }

        // Lex the attribute name and value. lexOpeningTagAttribute doesn't handle state transitions,
        // so we'll just yield the tokens it emits until it's done.
        await lexOpeningTagAttribute(
          streamWriter,
          pullChar,
          unreadChar,
          options
        );
      }
    }

    prevCharCode = nextCharCode;
  }
}

/**
 * @type {LexerStateFunction<"ATTRIBUTE_NAME" | "ATTRIBUTE_VALUE" | "EOF" | "ERROR", null>}
 */
async function lexOpeningTagAttribute(streamWriter, pullChar, unreadChar) {
  const attributeNameToken = await readOpeningTagAttributeName(
    pullChar,
    unreadChar
  );

  streamWriter.write(attributeNameToken);
  if (
    attributeNameToken.type === LexerTokenType.EOF ||
    attributeNameToken.type === LexerTokenType.ERROR
  ) {
    return null;
  }

  const { ch: attributeNameTerminatorCharCode, terminatorToken } =
    await pullChar();

  if (terminatorToken) {
    streamWriter.write(terminatorToken);
    return null;
  }

  if (attributeNameTerminatorCharCode === EQUALS) {
    // Looks like this attribute has a value. We need to determine if the value is quoted or not.
    const {
      ch: quoteOrAttributeValueCharCode,
      terminatorToken: quoteOrAttrValueTerminatorToken,
    } = await pullChar();

    if (quoteOrAttrValueTerminatorToken) {
      streamWriter.write(quoteOrAttrValueTerminatorToken);
      return null;
    }

    // Unread the next char so the next lexer can use it.
    const unreadErrToken = unreadChar();
    if (unreadErrToken) {
      streamWriter.write(unreadErrToken);
      return null;
    }

    if (isAttributeValueQuoteChar(quoteOrAttributeValueCharCode)) {
      const token = await readOpeningTagQuotedAttributeValue(
        pullChar,
        unreadChar
      );
      streamWriter.write(token);
      return null;
    } else if (
      isLegalUnquotedAttributeValueChar(quoteOrAttributeValueCharCode)
    ) {
      const token = await readOpeningTagUnquotedAttributeValue(
        pullChar,
        unreadChar
      );
      streamWriter.write(token);
      return null;
    }
  } else {
    // Looks like this is just a boolean attribute with no value,
    // so we'll transition back to lexing the opening tag contents.
    const unreadErrToken = unreadChar();
    if (unreadErrToken) {
      streamWriter.write(unreadErrToken);
      return null;
    }
  }

  return null;
}

/**
 * Read the attribute name until we encounter an illegal attribute name char; usually "=" for an attribute with a value or whitespace for a boolean attribute.
 * @param {PullCharFn} pullChar
 * @param {UnreadCharFn} unreadChar
 * @returns {Promise<LexerToken<"ATTRIBUTE_NAME" | "EOF" | "ERROR">>}
 */
async function readOpeningTagAttributeName(pullChar, unreadChar) {
  /**
   * @type {number[]}
   */
  let attributeNameCodePointString = [];

  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      return terminatorToken;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (!isLegalAttributeNameChar(nextCharCode)) {
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        return unreadErrToken;
      }

      return {
        type: LexerTokenType.ATTRIBUTE_NAME,
        value: String.fromCodePoint(...attributeNameCodePointString),
        l: startLine,
        c: startColumn,
      };
    }

    attributeNameCodePointString.push(nextCharCode);
  }
}

/**
 * Reads a quoted attribute value until the closing quote is encountered.
 * The opening quote will be the first character read.
 * @param {PullCharFn} pullChar
 * @param {UnreadCharFn} unreadChar
 * @returns {Promise<LexerToken<"ATTRIBUTE_VALUE" | "EOF" | "ERROR">>}
 */
async function readOpeningTagQuotedAttributeValue(pullChar, unreadChar) {
  /**
   * @type {number[]}
   */
  let attributeValueCodePointString = [];
  /**
   * @type {number|null}
   */
  let quoteCharCode = null;

  let isNextCharEscaped = false;

  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      return terminatorToken;
    }

    if (!startLine || !startColumn || !quoteCharCode) {
      quoteCharCode = nextCharCode;
      startLine = nextLine;
      startColumn = nextCol;
      // Continue to the next loop iteration since we don't want to include the quote character in the attribute value.
      continue;
    }

    if (nextCharCode === BACK_SLASH && !isNextCharEscaped) {
      // If we encountered an unescaped backslash, that means the next
      // character is escaped; don't include this escaping backslash in the attribute value.
      isNextCharEscaped = true;
    } else if (nextCharCode === quoteCharCode && !isNextCharEscaped) {
      // If the next char is a matching closing quote and isn't escaped,
      // we've reached the end of the attribute value.
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        return unreadErrToken;
      }

      return {
        type: LexerTokenType.ATTRIBUTE_VALUE,
        value: String.fromCodePoint(...attributeValueCodePointString),
        l: startLine,
        c: startColumn,
      };
    } else {
      attributeValueCodePointString.push(nextCharCode);
      isNextCharEscaped = false;
    }
  }
}

/**
 * Reads an unquoted attribute value until the next whitespace or tag end is encountered.
 * @param {PullCharFn} pullChar
 * @param {UnreadCharFn} unreadChar
 * @returns {Promise<LexerToken<"ATTRIBUTE_VALUE" | "EOF" | "ERROR">>}
 */
async function readOpeningTagUnquotedAttributeValue(pullChar, unreadChar) {
  /**
   * @type {number[]}
   */
  let attributeValueCodePointString = [];

  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      return terminatorToken;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (!isLegalUnquotedAttributeValueChar(nextCharCode)) {
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        return unreadErrToken;
      }

      return {
        type: LexerTokenType.ATTRIBUTE_VALUE,
        value: String.fromCodePoint(...attributeValueCodePointString),
        l: startLine,
        c: startColumn,
      };
    }

    attributeValueCodePointString.push(nextCharCode);
  }
}

/**
 * @type {LexerStateFunction<
 *  "EOF"|"ERROR"|"CLOSING_TAGNAME",
 *  typeof lexClosingTagEnd
 * >}
 */
async function lexClosingTagName(streamWriter, pullChar, unreadChar) {
  /**
   * @type {number[]}
   */
  let tagnameCodePointStr = [];

  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (!isLegalTagNameChar(nextCharCode)) {
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        streamWriter.write(unreadErrToken);
        return null;
      }

      streamWriter.write({
        type: LexerTokenType.CLOSING_TAGNAME,
        value: String.fromCodePoint(...tagnameCodePointStr),
        l: startLine,
        c: startColumn,
      });
      return lexClosingTagEnd;
    }

    tagnameCodePointStr.push(nextCharCode);
  }
}

/**
 * At this point, we are in a closing tag but after the tag name. We just need to read until
 * the closing ">" is encountered.
 * @type {LexerStateFunction<"EOF"|"ERROR", typeof lexTextContent>}
 */
async function lexClosingTagEnd(streamWriter, pullChar) {
  /**
   * @type {number|undefined}
   */
  let startLine;
  /**
   * @type {number|undefined}
   */
  let startColumn;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();
    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (nextCharCode === CLOSING_ANGLE_BRACKET) {
      return lexTextContent;
    }
  }
}

/**
 * HTML comment tags in form <!-- ... -->
 * This lexer is starting after the opening "<!--" tag, so it just needs to
 * read until the closing "-->" is encountered.
 * @type {LexerStateFunction<
 *  "COMMENT"|"EOF"|"ERROR",
 *  typeof lexTextContent
 * >}
 */
async function lexCommentTag(streamWriter, pullChar) {
  /**
   * @type {number|undefined}
   */
  let startLine;
  /**
   * @type {number|undefined}
   */
  let startColumn;

  /**
   * @type {number[]}
   */
  let commentContentCodePointStr = [];

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    const commentContentLength = commentContentCodePointStr.length;

    if (
      // Test that the last 3 chars are "-->" to close the comment tag
      nextCharCode === CLOSING_ANGLE_BRACKET &&
      commentContentCodePointStr[commentContentLength - 1] === HYPHEN &&
      commentContentCodePointStr[commentContentLength - 2] === HYPHEN
    ) {
      commentContentCodePointStr.length -= 2;

      streamWriter.write({
        type: LexerTokenType.COMMENT,
        value: String.fromCodePoint(...commentContentCodePointStr).trim(),
        l: startLine,
        c: startColumn,
      });
      return lexTextContent;
    }

    commentContentCodePointStr.push(nextCharCode);
  }
}

/**
 * Read the raw contents of a script or style tag until the closing tag is encountered.
 *
 * @type {LexerStateFunction<
 *  "EOF"|"ERROR"|"TEXT_CONTENT"|"CLOSING_TAGNAME",
 *  typeof lexClosingTagEnd,
 *  HTMLParserOptions & {
 *    tagName: string;
 *  }>}
 */
async function lexRawElementContent(
  streamWriter,
  pullChar,
  unreadChar,
  options
) {
  /**
   * @type {number|null}
   */
  let startLine = null;
  /**
   * @type {number|null}
   */
  let startColumn = null;

  /**
   * @type {number[]}
   */
  const rawContentCharCodes = [];

  const closingTagnameMatchString = `</${options.tagName}`;

  const isScript = options.tagName === "script";
  const isStyle = options.tagName === "style";

  /**
   * @type {number | null}
   */
  let unterminatedQuoteCharCode = null;

  let isNextQuoteCharEscaped = false;

  while (true) {
    const {
      ch: nextCharCode,
      l: nextLine,
      c: nextCol,
      terminatorToken,
    } = await pullChar();

    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (!startLine || !startColumn) {
      startLine = nextLine;
      startColumn = nextCol;
    }

    if (unterminatedQuoteCharCode !== null) {
      if (nextCharCode === BACK_SLASH && !isNextQuoteCharEscaped) {
        isNextQuoteCharEscaped = true;
      } else if (
        nextCharCode === unterminatedQuoteCharCode &&
        !isNextQuoteCharEscaped
      ) {
        // The quote character is not escaped, so we can now consider the quote as terminated.
        unterminatedQuoteCharCode = null;
        isNextQuoteCharEscaped = false;
      } else {
        isNextQuoteCharEscaped = false;
      }
    } else if (
      (isScript && isScriptQuoteChar(nextCharCode)) ||
      (isStyle && isStyleQuoteChar(nextCharCode))
    ) {
      unterminatedQuoteCharCode = nextCharCode;
    } else if (
      !isLegalTagNameChar(nextCharCode) &&
      rawContentCharCodes.length >= closingTagnameMatchString.length &&
      String.fromCodePoint(
        ...rawContentCharCodes.slice(-closingTagnameMatchString.length)
      ) === closingTagnameMatchString
    ) {
      const unreadErrToken = unreadChar();
      if (unreadErrToken) {
        streamWriter.write(unreadErrToken);
        return null;
      }

      const closingTagnameMatchStringLength = closingTagnameMatchString.length;
      rawContentCharCodes.length -= closingTagnameMatchStringLength;
      streamWriter.write({
        type: LexerTokenType.TEXT_CONTENT,
        value: String.fromCodePoint(...rawContentCharCodes),
        l: startLine,
        c: startColumn,
      });
      streamWriter.write({
        type: LexerTokenType.CLOSING_TAGNAME,
        value: options.tagName,
        l: nextLine,
        c: nextCol - closingTagnameMatchStringLength,
      });
      return lexClosingTagEnd;
    }

    rawContentCharCodes.push(nextCharCode);
  }
}

/**
 * Lexes a <!DOCTYPE> declaration.
 *
 * @param {PullCharFn} pullChar
 * @param {WritableStreamDefaultWriter<LexerToken<"EOF" | "ERROR"| "DOCTYPE_DECLARATION">>} streamWriter
 * @param {number} startLine
 * @param {number} startColumn
 * @returns {Promise<null>}
 */
async function lexDoctypeDeclaration(
  pullChar,
  streamWriter,
  startLine,
  startColumn
) {
  /**
   * @type {number[]}
   */
  const declarationValuesCodePointString = [];

  while (true) {
    const { ch: nextCharCode, terminatorToken } = await pullChar();

    if (terminatorToken) {
      streamWriter.write(terminatorToken);
      return null;
    }

    if (nextCharCode === CLOSING_ANGLE_BRACKET) {
      streamWriter.write({
        type: LexerTokenType.DOCTYPE_DECLARATION,
        value: String.fromCodePoint(...declarationValuesCodePointString).trim(),
        l: startLine,
        c: startColumn,
      });
      return null;
    }

    declarationValuesCodePointString.push(nextCharCode);
  }
}
