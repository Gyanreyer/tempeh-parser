import { test, describe } from "node:test";
import * as assert from "node:assert";

import { HTMLParser } from "../src/index.js";

describe("HTMLParseResult", () => {
  test("parse results are marked as used after the nodes have been streamed through once", async () => {
    const htmlParser = new HTMLParser();
    const htmlString = "<div>Hello, world!</div>";
    const parseResult = htmlParser.parseString(htmlString);
    assert.strictEqual(parseResult.used, false);
    /**
     * Recursively exhausts a parse result stream.
     *
     * @param {any} nodeStream
     */
    async function exhaustParseResult(nodeStream) {
      for await (const node of nodeStream) {
        if ("childStream" in node) {
          await exhaustParseResult(node.childStream);
        }
      }
    }
    await exhaustParseResult(parseResult);

    assert.strictEqual(parseResult.used, true);
    assert.rejects(
      () => parseResult.toArray(),
      new Error("HTMLParseResult instance has already been used")
    );
  });
});
