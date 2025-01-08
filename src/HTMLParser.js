import parseTemplate from "./parseTemplate.js";

/**
 * @import { StreamedTmphNode, TmphNode } from './types.js';
 * @import { ParseTemplateParams } from './parseTemplate.js';
 */

export class HTMLParseResult {
  /**
   * @type {ReadableStream<StreamedTmphNode> | null}
   */
  #readableStream;

  get used() {
    return !this.#readableStream;
  }

  /**
   * @param {ParseTemplateParams} params
   */
  constructor(params) {
    /**
     * @type {TransformStream<StreamedTmphNode, StreamedTmphNode>}
     */
    const rootNodeStream = new TransformStream();
    this.#readableStream = rootNodeStream.readable;
    parseTemplate(params, rootNodeStream.writable);
  }

  async *[Symbol.asyncIterator]() {
    if (!this.#readableStream) {
      throw new Error("HTMLParseResult instance has already been used");
    }
    const readableStream = this.#readableStream;
    this.#readableStream = null;

    yield* readableStream;
  }

  /**
   * @param {StreamedTmphNode} node
   * @returns {Promise<TmphNode>}
   */
  async getResolvedStreamedElementNode(node) {
    if (!("childStream" in node)) {
      return node;
    }

    const { childStream, ...rest } = node;

    /**
     * @type {TmphNode[]}
     */
    const children = [];
    for await (const child of childStream) {
      children.push(await this.getResolvedStreamedElementNode(child));
    }

    if (children.length > 0) {
      return {
        ...rest,
        children,
      };
    }

    return rest;
  }

  async toArray() {
    /**
     * @type {TmphNode[]}
     */
    const nodes = [];
    for await (const node of this) {
      nodes.push(await this.getResolvedStreamedElementNode(node));
    }

    return nodes;
  }
}

export class HTMLParser {
  /**
   * Takes the path to an HTML file and parses it into a JSON representation.
   *
   * @param {string} filePath
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = await parser.parse("path/to/file.html").toArray();
   *
   * for await (const node of parser.parse("path/to/file.html")) {
   *   // Or we can process the nodes as they stream in
   * }
   */
  parseFile(filePath) {
    return new HTMLParseResult({ filePath });
  }

  /**
   * Takes an HTML string and parses it into a JSON representation.
   *
   * @param {string} rawHTMLString
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = await parser.parseString("<div>Hello, world!</div>").toArray();
   * for await (const node of parser.parseString(htmlString)) {
   *   // Or we can process the nodes as they stream in
   * }
   */
  parseString(rawHTMLString) {
    return new HTMLParseResult({ rawHTMLString });
  }
}
