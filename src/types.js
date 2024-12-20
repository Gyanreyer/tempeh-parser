/**
 * @typedef {Object} BaseTmphContentProperties
 * @property {number} l Line number
 * @property {number} c Column number
 */

/**
 * @typedef {Object} TmphElementAttributeProperties
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef {BaseTmphContentProperties & TmphElementAttributeProperties} TmphElementAttribute
 */

/**
 * @typedef {Object} TmphElementNodeProperties
 * @property {string} tagName
 * @property {TmphElementAttribute[]} [attributes]
 * @property {TmphNode[]} [children]
 */

/** @typedef {BaseTmphContentProperties & TmphElementNodeProperties} TmphElementNode */

/**
 * @typedef {Object} TmphTextNodeProperties
 * @property {string} textContent
 */

/**
 * @typedef {BaseTmphContentProperties & TmphTextNodeProperties} TmphTextNode
 */

/**
 * @typedef {Object} TmphDoctypeDeclarationNodeProperties
 * @property {string} doctypeDeclaration
 */

/** @typedef {BaseTmphContentProperties & TmphDoctypeDeclarationNodeProperties} TmphDoctypeDeclarationNode */

/**
 * @typedef {TmphElementNode | TmphTextNode | TmphDoctypeDeclarationNode} TmphNode
 */

/**
 * Export empty object so the typedefs will be exported
 */
export {};
