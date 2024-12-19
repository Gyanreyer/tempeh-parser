import { Piscina } from "piscina";
import { MessageChannel } from "node:worker_threads";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * @import { TmphNode } from './templateData';
 * @import { MessagePort } from 'node:worker_threads';
 */

export class HTMLParser {
  /**
   * @type {Piscina<{
   *  filePath: string;
   *  messagePort: MessagePort;
   * }, void>}
   */
  #pool;

  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.#pool = new Piscina({
      filename: import.meta.resolve("./parseTemplate.worker.js"),
    });
  }

  /**
   * Takes the path to an HTML file and parses it into a JSON representation.
   * This function is an async generator that yields root-level nodes from the parsed file as they stream in.
   *
   * @param {string} filePath
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = [];
   * for await (const node of parser.parseIterable("path/to/file.html")) {
   *  nodes.push(node);
   * }
   */
  async *parseIterable(filePath) {
    const { port1, port2 } = new MessageChannel();

    const runPromise = this.#pool.run(
      { filePath, messagePort: port2 },
      { transferList: [port2] }
    );

    try {
      while (true) {
        const nextToken = await /** @type {Promise<TmphNode | null>} */ (
          new Promise((resolve, reject) => {
            /**
             * @param {TmphNode | Error} message
             */
            const onMessage = (message) => {
              cleanupListeners();
              if (message instanceof Error) {
                port1.close();
                reject(message);
              } else {
                resolve(message);
              }
            };
            /**
             * @param {Error} error
             */
            const onMessageError = (error) => {
              cleanupListeners();
              reject(error);
            };
            const onClose = () => {
              cleanupListeners();
              resolve(null);
            };
            function cleanupListeners() {
              port1.off("message", onMessage);
              port1.off("messageerror", onMessageError);
              port1.off("close", onClose);
            }

            port1.on("message", onMessage);
            port1.on("messageerror", onMessageError);
            port1.on("close", onClose);
          })
        );

        if (!nextToken) {
          break;
        }
        yield nextToken;
      }
    } finally {
      port1.close();
      await runPromise;
    }
  }

  /**
   * Takes the path to an HTML file and parses it into a JSON representation.
   *
   * @param {string} filePath
   * @returns {Promise<TmphNode[]>}
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = await parser.parse("path/to/file.html");
   */
  async parse(filePath) {
    /**
     * @type {TmphNode[]}
     */
    const nodes = [];
    for await (const node of this.parseIterable(filePath)) {
      nodes.push(node);
    }
    return nodes;
  }

  /**
   * Takes an HTML string and parses it into a JSON representation.
   * This function is an async generator that yields root-level nodes
   * from the parsed HTML as they stream in.
   *
   * @param {string} htmlString
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = [];
   * for await (const node of parser.parseStringIterable("<div>Hello, world!</div>")) {
   *  nodes.push(node);
   * }
   */
  async *parseStringIterable(htmlString) {
    /**
     * @type {string|undefined}
     */
    let tempFilePath;

    try {
      // Write the HTML to a temp file and then parse it with parseIterable
      const tempDirPath = await mkdtemp(join(tmpdir(), `tempeh-html-parser`));
      const fileHash = createHash("sha256").update(htmlString).digest("hex");
      tempFilePath = join(tempDirPath, `${fileHash}.html`);
      await writeFile(tempFilePath, htmlString);
      yield* this.parseIterable(tempFilePath);
    } finally {
      if (tempFilePath) {
        await unlink(tempFilePath);
      }
    }
  }

  /**
   * Takes an HTML string and parses it into a JSON representation.
   *
   * @param {string} htmlString
   * @returns {Promise<TmphNode[]>}
   *
   * @example
   * const parser = new HTMLParser();
   * const nodes = await parser.parseString("<div>Hello, world!</div>");
   */
  async parseString(htmlString) {
    /**
     * @type {TmphNode[]}
     */
    const nodes = [];
    for await (const node of this.parseStringIterable(htmlString)) {
      nodes.push(node);
    }
    return nodes;
  }
}
