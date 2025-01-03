import { Piscina } from "piscina";
import parseTemplate from "./parseTemplate.js";

/**
 * @import { StreamedTmphNode, TmphNode } from './types.js';
 * @import { ParseTemplateParams } from './parseTemplate.js';
 */

export class HTMLParseResult {
  /**
   * @type {AsyncGenerator<StreamedTmphNode, void, unknown> | null}
   */
  #generator;

  get used() {
    return !this.#generator;
  }

  /**
   *
   * @param {AsyncGenerator<TmphNode, void, unknown>} generator
   */
  constructor(generator) {
    this.#generator = generator;
  }

  async *[Symbol.asyncIterator]() {
    if (!this.#generator) {
      throw new Error("HTMLParseResult instance has already been used");
    }
    try {
      yield* this.#generator;
    } catch (err) {
      // Re-throw any errors
      throw err;
    } finally {
      this.#generator = null;
    }
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

    return {
      ...rest,
      children,
    };
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
   * @type {Piscina<ParseTemplateParams, void>}
   */
  #pool;

  constructor() {
    this.#pool = new Piscina({
      filename: import.meta.resolve("./parseTemplate.js"),
    });
  }

  /**
   * Takes the path to an HTML file and parses it into a JSON representation.
   * This function is an async generator that yields root-level nodes from the parsed file as they stream in.
   *
   * @param {{
   *  filePath: string;
   *  rawHTMLString?: never;
   * } | {
   *  rawHTMLString: string;
   *  filePath?: never;
   * }} params
   */
  async *#runParser(params) {
    const rootNodeStream = new TransformStream();
    const promise = parseTemplate(params, rootNodeStream.writable);

    yield* rootNodeStream.readable;

    await promise;
    // const runPromise = this.#pool.run(
    //   { ...params, writableStream: writable },
    //   {
    //     transferList: [
    //       // @ts-expect-error - WritableStream is not typed as a TransferListItem, but it can be safely transferred. Don't know what's up with that.
    //       writable,
    //     ],
    //   }
    // );
  }

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
    return new HTMLParseResult(this.#runParser({ filePath }));
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
    return new HTMLParseResult(this.#runParser({ rawHTMLString }));
  }
}
