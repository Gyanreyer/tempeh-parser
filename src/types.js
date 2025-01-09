/**
 * @typedef {Object} BaseTmphContentProperties
 * @property {number} l Line number
 * @property {number} c Column number
 */

/**
 * @typedef {Object} TmphElementAttributeProperties
 * @property {string} name
 * @property {string} value
 *
 * @typedef {BaseTmphContentProperties & TmphElementAttributeProperties} TmphElementAttribute
 */

/**
 * @typedef {Object} TmphElementNodeProperties
 * @property {string} tagName
 * @property {TmphElementAttribute[]} [attributes]
 * @property {TmphNode[]} [children]
 *
 * @typedef {BaseTmphContentProperties & TmphElementNodeProperties} TmphElementNode
 */

/**
 * @typedef {Object} StreamedTmphElementNodeProperties
 * @property {string} tagName
 * @property {TmphElementAttribute[]} [attributes]
 * @property {ReadableStream<StreamedTmphNode>} [childStream]
 *
 * @typedef {BaseTmphContentProperties & StreamedTmphElementNodeProperties} StreamedTmphElementNode
 */

/**
 * @typedef {Object} TmphTextNodeProperties
 * @property {string} textContent
 *
 * @typedef {BaseTmphContentProperties & TmphTextNodeProperties} TmphTextNode
 */

/**
 * @typedef {Object} TmphDoctypeDeclarationNodeProperties
 * @property {string} doctypeDeclaration
 *
 * @typedef {BaseTmphContentProperties & TmphDoctypeDeclarationNodeProperties} TmphDoctypeDeclarationNode
 */

/**
 * @typedef {Object} TmphCommentNodeProperties
 * @property {string} comment
 *
 * @typedef {BaseTmphContentProperties & TmphCommentNodeProperties} TmphCommentNode
 */

/**
 * @typedef {TmphElementNode | TmphTextNode | TmphDoctypeDeclarationNode | TmphCommentNode} TmphNode
 */

/**
 * @typedef {StreamedTmphElementNode | TmphTextNode | TmphDoctypeDeclarationNode | TmphCommentNode} StreamedTmphNode
 */

/**
 * @typedef {"upper" | "lower" | "preserve"} TagNameCasingMode
 */

/**
 * @typedef {{
 *  filePath: string;
 *  rawHTMLString?: never;
 * } | {
 *  filePath?: never;
 *  rawHTMLString: string;
 * }} HTMLParserSource
 */

/**
 * @typedef HTMLParserOptions
 * @property {TagNameCasingMode} tagNameCasing - The mode to use for transforming the casing of parsed element tag names.
 * @property {boolean} ignoreSelfClosingSyntax - Whether to ignore self-closing `/>` syntax on non-void elements, matching how the official HTML spec behaves (ie, `<div />` will be treated as an open div which subsequent contents will be a child of.
 */

/**
 * Export empty object so the typedefs will be exported
 */
export {};
