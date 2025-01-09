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

  test("parse results can be iterated over as expected", async () => {
    const htmlParser = new HTMLParser();
    const htmlString =
      "<div>Hello <span class='icon' aria-role=presentation>👋</span>, world!</div>";

    const parseResult = htmlParser.parseString(htmlString);
    /**
     * @type {import("src/types.js").StreamedTmphNode[]}
     */
    const rootNodes = [];

    for await (const node of parseResult) {
      rootNodes.push(node);
    }

    assert.strictEqual(rootNodes.length, 1);
    const rootDivNode = rootNodes[0];
    if (!("childStream" in rootDivNode)) {
      throw new Error("Expected root node to have a child stream");
    }

    assert.strictEqual(rootDivNode.tagName, "div");
    assert.strictEqual("attributes" in rootDivNode, false);

    const childNodes = [];
    for await (const node of rootDivNode.childStream) {
      childNodes.push(node);
    }

    assert.strictEqual(childNodes.length, 3);
    assert.deepStrictEqual(childNodes[0], {
      textContent: "Hello ",
      l: 1,
      c: 6,
    });
    assert.deepStrictEqual(childNodes[2], {
      textContent: ", world!",
      l: 1,
      c: 62,
    });

    const spanNode = childNodes[1];
    if (!("childStream" in spanNode)) {
      throw new Error("Expected span node to have a child stream");
    }

    assert.strictEqual(spanNode.tagName, "span");
    assert.deepStrictEqual(spanNode.attributes, [
      {
        name: "class",
        value: "icon",
        l: 1,
        c: 18,
      },
      {
        name: "aria-role",
        value: "presentation",
        l: 1,
        c: 31,
      },
    ]);

    const spandChildNodes = [];

    for await (const node of spanNode.childStream) {
      spandChildNodes.push(node);
    }

    assert.strictEqual(spandChildNodes.length, 1);
    assert.deepStrictEqual(spandChildNodes[0], {
      textContent: "👋",
      l: 1,
      c: 54,
    });
  });
});
