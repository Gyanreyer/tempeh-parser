const LOWER_A = 97;
const LOWER_Z = 122;
const UPPER_A = 65;
const UPPER_Z = 90;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLetter = (charCode) =>
  (charCode >= LOWER_A && charCode <= LOWER_Z) ||
  (charCode >= UPPER_A && charCode <= UPPER_Z);

const SPACE = 32;
const TAB = 9;
const NEWLINE = 10;
const VERTICAL_TAB = 11;
const FORM_FEED = 12;
const CARRIAGE_RETURN = 13;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLineBreak = (charCode) =>
  charCode >= NEWLINE && charCode <= CARRIAGE_RETURN;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isWhitespace = (charCode) =>
  charCode === SPACE || (charCode >= TAB && charCode <= CARRIAGE_RETURN);

const UNDERSCORE = 95;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLegalLeadingTagNameChar = (charCode) =>
  isLetter(charCode) || charCode === UNDERSCORE;

const ONE = 49;
const NINE = 57;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isNumber = (charCode) => charCode >= ONE && charCode <= NINE;

export const HYPHEN = 45;
const PERIOD = 46;
const COLON = 58;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
const isLegalTagNameSpecialChar = (charCode) =>
  charCode === HYPHEN ||
  charCode === PERIOD ||
  charCode === COLON ||
  charCode === UNDERSCORE;

const PCEN_CHAR_RANGES = [
  //
  0xc0, 0xd6,
  //
  0xd8, 0xf6,
  //
  0xf8, 0x37d,
  //
  0x37f, 0x1fff,
  //
  0x200c, 0x200d,
  //
  0x203f, 0x2040,
  //
  0x2070, 0x218f,
  //
  0x2c00, 0x2fef,
  //
  0x3001, 0xd7ff,
  //
  0xf900, 0xfdcf,
  //
  0xfdf0, 0xfffd,
  //
  0x10000, 0xeffff,
];

/**
 * Test if the character is a valid PCEN ("PotentialCustomElementName") unicode character for a tag name
 * @param {number} charCode
 * @returns {boolean}
 */
export const isPCENChar = (charCode) => {
  for (let i = 0; i < PCEN_CHAR_RANGES.length; i += 2) {
    if (
      charCode >= /** @type {number} */ (PCEN_CHAR_RANGES[i]) &&
      charCode <= /** @type {number} */ (PCEN_CHAR_RANGES[i + 1])
    ) {
      return true;
    }
  }

  return false;
};

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLegalTagNameChar = (charCode) =>
  isLegalTagNameSpecialChar(charCode) ||
  isLetter(charCode) ||
  isNumber(charCode) ||
  isPCENChar(charCode);

const SINGLE_QUOTE = 39;
const DOUBLE_QUOTE = 34;
const BACKTICK = 96;

/**
 *
 * @param {number} charCode
 * @returns {boolean}
 */
export const isScriptQuoteChar = (charCode) =>
  charCode === SINGLE_QUOTE ||
  charCode === DOUBLE_QUOTE ||
  charCode === BACKTICK;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isStyleQuoteChar = (charCode) =>
  charCode === SINGLE_QUOTE || charCode === DOUBLE_QUOTE;

const rawTextContentTagnames = Object.freeze({
  script: true,
  style: true,
  textarea: true,
  title: true,
});

/**
 * @param {string} tagName
 * @returns {boolean}
 */
export const isRawTextContentElementTagname = (tagName) =>
  Object.hasOwn(rawTextContentTagnames, tagName);

const voidTagnames = Object.freeze({
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
});

/**
 * @param {string} tagName
 * @returns {boolean}
 */
export const isVoidElementTagname = (tagName) =>
  Object.hasOwn(voidTagnames, tagName);

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isAttributeValueQuoteChar = (charCode) =>
  charCode === SINGLE_QUOTE || charCode === DOUBLE_QUOTE;

// "<"
export const OPENING_ANGLE_BRACKET = 60;
// ">"
export const CLOSING_ANGLE_BRACKET = 62;

// "/"
export const FWD_SLASH = 47;
// "\"
export const BACK_SLASH = 92;

export const EQUALS = 61;

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLegalAttributeNameChar = (charCode) =>
  !(
    charCode === EQUALS ||
    charCode === CLOSING_ANGLE_BRACKET ||
    charCode === FWD_SLASH ||
    isWhitespace(charCode) ||
    isAttributeValueQuoteChar(charCode)
  );

/**
 * @param {number} charCode
 * @returns {boolean}
 */
export const isLegalUnquotedAttributeValueChar = (charCode) =>
  !(
    isWhitespace(charCode) ||
    isAttributeValueQuoteChar(charCode) ||
    charCode === CLOSING_ANGLE_BRACKET ||
    charCode === OPENING_ANGLE_BRACKET
  );

export const EXCLAMATION_PT = 33;
