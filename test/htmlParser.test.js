import { test, describe } from "node:test";
import * as assert from "node:assert";

import { HTMLParser } from "../src/index.js";

describe("HTMLParser", () => {
  describe("tagNameCasing option", () => {
    test("tagNameCasing 'lower' mode works as expected", async () => {
      const htmlParser = new HTMLParser();
      assert.strictEqual(
        htmlParser.options.tagNameCasing,
        "lower",
        "Default tagNameCasing mode should be 'lower'."
      );
      const htmlString = "<div>Hello, world!</Div>";
      assert.deepStrictEqual(
        await htmlParser.parseString(htmlString).toArray(),
        [
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
        ]
      );
    });

    test("tagNameCasing 'upper' mode works as expected", async () => {
      const htmlParser = new HTMLParser({
        tagNameCasing: "upper",
      });
      const htmlString = "<dIv>Hello, world!</diV>";
      assert.deepStrictEqual(
        await htmlParser.parseString(htmlString).toArray(),
        [
          {
            tagName: "DIV",
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
        ]
      );
    });

    test("tagNameCasing 'preserve' mode works as expected", async () => {
      const htmlParser = new HTMLParser({
        tagNameCasing: "preserve",
      });
      const htmlString = "<Div>Hello, world!</div><Span>👋</Span>";
      assert.deepStrictEqual(
        await htmlParser.parseString(htmlString).toArray(),
        [
          {
            tagName: "Div",
            children: [
              {
                textContent: "Hello, world!",
                c: 6,
                l: 1,
              },
              {
                tagName: "Span",
                children: [
                  {
                    textContent: "👋",
                    c: 31,
                    l: 1,
                  },
                ],
                c: 26,
                l: 1,
              },
            ],
            c: 2,
            l: 1,
          },
        ],
        "Tag names should be case-sensitive, so </div> should not close <Div> and therefore be ignored."
      );
    });
  });

  describe("ignoreSelfClosingSyntax option", () => {
    test("Self-closing syntax in opening tags is respected when ignoreSelfClosingSyntax is disabled", async () => {
      const htmlParser = new HTMLParser();
      assert.strictEqual(htmlParser.options.ignoreSelfClosingSyntax, false);

      const htmlString =
        "<div/>Hello, world!<span/><input type=text />Bye now!";

      assert.deepStrictEqual(
        await htmlParser.parseString(htmlString).toArray(),
        [
          {
            tagName: "div",
            c: 2,
            l: 1,
          },
          {
            textContent: "Hello, world!",
            c: 7,
            l: 1,
          },
          {
            tagName: "span",
            c: 21,
            l: 1,
          },
          {
            tagName: "input",
            attributes: [
              {
                name: "type",
                value: "text",
                c: 34,
                l: 1,
              },
            ],
            c: 28,
            l: 1,
          },
          {
            textContent: "Bye now!",
            c: 46,
            l: 1,
          },
        ],
        "Self-closing syntax should be respected and terminate non-void opening tags."
      );
    });

    test("Enabling ignoreSelfClosingSyntax ignores self-closing syntax in opening tags", async () => {
      const htmlParser = new HTMLParser({
        ignoreSelfClosingSyntax: true,
      });
      const htmlString =
        "<div/>Hello, world!<span/><input type=text />Bye now!";
      assert.deepStrictEqual(
        await htmlParser.parseString(htmlString).toArray(),
        [
          {
            tagName: "div",
            children: [
              {
                textContent: "Hello, world!",
                c: 7,
                l: 1,
              },
              {
                tagName: "span",
                children: [
                  {
                    tagName: "input",
                    attributes: [
                      {
                        name: "type",
                        value: "text",
                        c: 34,
                        l: 1,
                      },
                    ],
                    c: 28,
                    l: 1,
                  },
                  {
                    textContent: "Bye now!",
                    c: 46,
                    l: 1,
                  },
                ],
                c: 21,
                l: 1,
              },
            ],
            c: 2,
            l: 1,
          },
        ],
        "Self-closing syntax should be ignored and not terminate non-void opening tags."
      );
    });
  });
});
