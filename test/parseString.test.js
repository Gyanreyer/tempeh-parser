import { test, describe } from "node:test";
import * as assert from "node:assert";

import { HTMLParser } from "../src/index.js";

/**
 * @import { TmphNode } from '../src/types.js';
 */

describe("HTMLParser.parseString", () => {
  test("should parse a simple HTML string as expected", async () => {
    const htmlParser = new HTMLParser();
    const htmlString = "<div>Hello, world!</div>";
    const nodes = await htmlParser.parseString(htmlString).toArray();
    assert.deepStrictEqual(
      nodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "div",
          children: [
            {
              textContent: "Hello, world!",
              c: 6,
              l: 1,
            },
          ],
          c: 2,
          l: 1,
        },
      ])
    );
  });

  test("should parse a more complex HTML string with child elements", async () => {
    const htmlParser = new HTMLParser();
    const htmlString = /* html */ `<div>
  Hello, world!
</div>
<p>This is <em>another</em> paragraph.</p>
`;

    /**
     * @type {TmphNode[]}
     */
    const expectedNodes = [
      {
        tagName: "div",
        children: [
          {
            textContent: "\n  Hello, world!\n",
            c: 1,
            l: 2,
          },
        ],
        c: 2,
        l: 1,
      },
      {
        textContent: "\n",
        c: 1,
        l: 4,
      },
      {
        tagName: "p",
        children: [
          {
            textContent: "This is ",
            c: 4,
            l: 4,
          },
          {
            tagName: "em",
            children: [
              {
                textContent: "another",
                c: 16,
                l: 4,
              },
            ],
            c: 13,
            l: 4,
          },
          {
            textContent: " paragraph.",
            c: 28,
            l: 4,
          },
        ],
        c: 2,
        l: 4,
      },
      {
        textContent: "\n",
        c: 1,
        l: 5,
      },
    ];

    assert.deepStrictEqual(
      await htmlParser.parseString(htmlString).toArray(),
      expectedNodes
    );
  });
});
