import { test, describe } from "node:test";
import * as assert from "node:assert";

import { HTMLParser } from "../src/index.js";

const fixturesDirPath = import.meta
  .resolve("../test/fixtures/")
  .slice("file://".length);

/**
 * @import { TmphNode } from '../src/templateData.js';
 */

describe("HTMLParser.parse", () => {
  test("should parse a simple component file as expected", async () => {
    const templateSourceFilePath = `${fixturesDirPath}simpleComponent.tmph.html`;

    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "div",
          attributes: [
            {
              name: "data-this",
              value: "attr_value_has_no_quotes",
              l: 1,
              c: 6,
            },
          ],
          children: [
            {
              textContent: "Hello, world!",
              l: 1,
              c: 41,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\nSome root-level text\n",
          l: 2,
          c: 1,
        },
        {
          tagName: "button",
          attributes: [
            {
              name: "role",
              value: "button",
              l: 3,
              c: 9,
            },
            {
              name: "aria-disabled",
              value: "",
              l: 3,
              c: 23,
            },
            {
              name: "disabled",
              value: "",
              l: 3,
              c: 37,
            },
            {
              name: "aria-label",
              value: "My custom label",
              l: 3,
              c: 46,
            },
          ],
          children: [
            {
              textContent: "\n  Click me\n  ",
              l: 4,
              c: 1,
            },
            {
              tagName: "svg",
              attributes: [
                {
                  name: "viewBox",
                  value: "0 0 100 100",
                  l: 5,
                  c: 8,
                },
                {
                  name: "xmlns",
                  value: "http://www.w3.org/2000/svg",
                  l: 5,
                  c: 30,
                },
                {
                  name: "aria-hidden",
                  value: "",
                  l: 5,
                  c: 65,
                },
              ],
              children: [
                {
                  textContent: "\n    ",
                  l: 6,
                  c: 1,
                },
                {
                  tagName: "circle",
                  attributes: [
                    {
                      name: "cx",
                      value: "50",
                      l: 6,
                      c: 13,
                    },
                    {
                      name: "cy",
                      value: "50",
                      l: 6,
                      c: 21,
                    },
                    {
                      name: "r",
                      value: "50",
                      l: 6,
                      c: 29,
                    },
                  ],
                  l: 6,
                  c: 6,
                },
                {
                  textContent: "\n  ",
                  l: 7,
                  c: 1,
                },
              ],
              l: 5,
              c: 4,
            },
            {
              textContent: "\n",
              l: 8,
              c: 1,
            },
          ],
          l: 3,
          c: 2,
        },
        {
          textContent: "\n",
          l: 9,
          c: 1,
        },
        {
          tagName: "p",
          children: [
            {
              textContent: "Spaces should ",
              l: 9,
              c: 4,
            },
            {
              tagName: "_",
              children: [
                {
                  textContent: "be",
                  l: 9,
                  c: 21,
                },
              ],
              l: 9,
              c: 19,
            },
            {
              textContent: " ",
              l: 9,
              c: 27,
            },
            {
              tagName: "em",
              children: [
                {
                  textContent: "preserved",
                  l: 9,
                  c: 32,
                },
              ],
              l: 9,
              c: 29,
            },
            {
              textContent: "    ",
              l: 9,
              c: 46,
            },
            {
              tagName: "strong",
              children: [
                {
                  textContent: "between\n    tags\n  ",
                  l: 9,
                  c: 58,
                },
              ],
              l: 9,
              c: 51,
            },
            {
              textContent: "\n",
              l: 12,
              c: 1,
            },
          ],
          l: 9,
          c: 2,
        },
        {
          textContent: "\n",
          l: 13,
          c: 1,
        },
      ])
    );
  });

  test("should parse a component file with inline sub-components", async () => {
    const templateSourceFilePath = `${fixturesDirPath}inlineSubComponents.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "ul",
          children: [
            {
              textContent: "\n  ",
              l: 2,
              c: 1,
            },
            {
              tagName: "ListItem",
              attributes: [
                {
                  name: "#for:item",
                  value: "items",
                  l: 2,
                  c: 13,
                },
                {
                  name: ":name",
                  value: "item.name",
                  l: 2,
                  c: 31,
                },
                {
                  name: "#text",
                  value: "item.value",
                  l: 2,
                  c: 49,
                },
              ],
              l: 2,
              c: 4,
            },
            {
              textContent: "\n",
              l: 3,
              c: 1,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n\n",
          l: 4,
          c: 1,
        },
        {
          tagName: "template",
          attributes: [
            {
              name: "id",
              value: "ListItem",
              l: 5,
              c: 11,
            },
            {
              name: "#component",
              value: "",
              l: 5,
              c: 25,
            },
          ],
          children: [
            {
              textContent: "\n  ",
              l: 6,
              c: 1,
            },
            {
              tagName: "li",
              children: [
                {
                  textContent: "\n    ",
                  l: 7,
                  c: 1,
                },
                {
                  tagName: "strong",
                  attributes: [
                    {
                      name: "#text",
                      value: "`${name}:`",
                      l: 7,
                      c: 13,
                    },
                  ],
                  l: 7,
                  c: 6,
                },
                {
                  textContent: "\n    ",
                  l: 8,
                  c: 1,
                },
                {
                  tagName: "slot",
                  l: 8,
                  c: 6,
                },
                {
                  textContent: "\n  ",
                  l: 9,
                  c: 1,
                },
              ],
              l: 6,
              c: 4,
            },
            {
              textContent: "\n",
              l: 10,
              c: 1,
            },
          ],
          l: 5,
          c: 2,
        },
        {
          textContent: "\n",
          l: 11,
          c: 1,
        },
        {
          tagName: "template",
          attributes: [
            {
              name: "id",
              value: "WhackyComponent",
              l: 11,
              c: 11,
            },
            {
              name: "#component",
              value: "",
              l: 11,
              c: 32,
            },
          ],
          children: [
            {
              textContent: "\n  ",
              l: 12,
              c: 1,
            },
            {
              tagName: "div",
              children: [
                {
                  textContent: "\n    ",
                  l: 13,
                  c: 1,
                },
                {
                  tagName: "InnerComponent",
                  l: 13,
                  c: 6,
                },
                {
                  textContent: "\n    ",
                  l: 14,
                  c: 1,
                },
                {
                  tagName: "template",
                  attributes: [
                    {
                      name: "id",
                      value: "NestedComponent",
                      l: 14,
                      c: 15,
                    },
                    {
                      name: "#component",
                      value: "",
                      l: 14,
                      c: 36,
                    },
                  ],
                  children: [
                    {
                      textContent: "\n      ",
                      l: 15,
                      c: 1,
                    },
                    {
                      tagName: "slot",
                      attributes: [
                        {
                          name: "name",
                          value: "before",
                          l: 15,
                          c: 13,
                        },
                      ],
                      l: 15,
                      c: 8,
                    },
                    {
                      textContent: "\n      ",
                      l: 16,
                      c: 1,
                    },
                    {
                      tagName: "div",
                      children: [
                        {
                          textContent: "Why would you do this?!",
                          l: 16,
                          c: 12,
                        },
                      ],
                      l: 16,
                      c: 8,
                    },
                    {
                      textContent: "\n      ",
                      l: 17,
                      c: 1,
                    },
                    {
                      tagName: "slot",
                      attributes: [
                        {
                          name: "name",
                          value: "after",
                          l: 17,
                          c: 13,
                        },
                      ],
                      l: 17,
                      c: 8,
                    },
                    {
                      textContent: "\n    ",
                      l: 18,
                      c: 1,
                    },
                  ],
                  l: 14,
                  c: 6,
                },
                {
                  textContent: "\n  ",
                  l: 19,
                  c: 1,
                },
              ],
              l: 12,
              c: 4,
            },
            {
              textContent: "\n",
              l: 20,
              c: 1,
            },
          ],
          l: 11,
          c: 2,
        },
        {
          textContent: "\n",
          l: 21,
          c: 1,
        },
      ])
    );
  });

  test("should parse a component file with styles", async () => {
    const templateSourceFilePath = `${fixturesDirPath}componentWithStyles.tmph.html`;

    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "main",
          children: [
            {
              textContent: "\n  ",
              l: 2,
              c: 1,
            },
            {
              tagName: "h1",
              children: [
                {
                  textContent: "Heading",
                  l: 2,
                  c: 7,
                },
              ],
              l: 2,
              c: 4,
            },
            {
              textContent: "\n  ",
              l: 3,
              c: 1,
            },
            {
              tagName: "p",
              children: [
                {
                  textContent: "Paragraph",
                  l: 3,
                  c: 6,
                },
              ],
              l: 3,
              c: 4,
            },
            {
              textContent: "\n",
              l: 4,
              c: 1,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n",
          l: 5,
          c: 1,
        },
        {
          tagName: "style",
          children: [
            {
              textContent:
                "\n  @scope {\n    main {\n      font-size: 1.2em;\n    }\n\n    h1,\n    p {\n      margin: 0;\n    }\n  }\n",
              l: 6,
              c: 1,
            },
          ],
          l: 5,
          c: 2,
        },
        {
          textContent: "\n",
          l: 17,
          c: 1,
        },
        {
          tagName: "style",
          attributes: [
            {
              name: "#bucket:global",
              value: "",
              l: 17,
              c: 8,
            },
          ],
          children: [
            {
              textContent: "\n  :root {\n    --color: #333;\n  }\n",
              l: 18,
              c: 1,
            },
          ],
          l: 17,
          c: 2,
        },
        {
          textContent: "\n",
          l: 22,
          c: 1,
        },
        {
          tagName: "style",
          attributes: [
            {
              name: "#raw",
              value: "",
              l: 22,
              c: 8,
            },
          ],
          children: [
            {
              textContent: "\n  main {\n    color: red;\n  }\n",
              l: 23,
              c: 1,
            },
          ],
          l: 22,
          c: 2,
        },
        {
          textContent: "\n",
          l: 27,
          c: 1,
        },
      ])
    );
  });

  test("should parse a component file with scripts", async () => {
    const templateSourceFilePath = `${fixturesDirPath}componentWithScripts.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "button",
          children: [
            {
              textContent: "Click me!",
              l: 1,
              c: 9,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n",
          l: 2,
          c: 1,
        },
        {
          tagName: "script",
          attributes: [
            {
              name: "#scope:component",
              value: "",
              l: 2,
              c: 9,
            },
          ],
          children: [
            {
              textContent:
                "\n  const observer = new IntersectionObserver((entries) => {\n    entries.forEach((entry) => {\n      if (entry.isIntersecting) {\n        entry.target.opacity = 1;\n      }\n    });\n  });\n",
              l: 3,
              c: 1,
            },
          ],
          l: 2,
          c: 2,
        },
        {
          textContent: "\n",
          l: 11,
          c: 1,
        },
        {
          tagName: "script",
          attributes: [
            {
              name: "#scope:instance",
              value: "",
              l: 11,
              c: 9,
            },
          ],
          children: [
            {
              textContent:
                '\n  this.addEventListener("click", () => console.log("You clicked me!"));\n\n  observer.observe(this);\n',
              l: 12,
              c: 1,
            },
          ],
          l: 11,
          c: 2,
        },
        {
          textContent: "\n",
          l: 16,
          c: 1,
        },
        {
          tagName: "script",
          children: [
            {
              textContent: '\n  console.log("This is a global script!");\n',
              l: 17,
              c: 1,
            },
          ],
          l: 16,
          c: 2,
        },
        {
          textContent: "\n",
          l: 19,
          c: 1,
        },
        {
          tagName: "script",
          attributes: [
            {
              name: "#render",
              value: "",
              l: 19,
              c: 9,
            },
            {
              name: "#",
              value: "this is a comment!",
              l: 19,
              c: 17,
            },
            {
              name: "#",
              value: 'here are some escaped "quotes"',
              l: 19,
              c: 40,
            },
          ],
          children: [
            {
              textContent:
                "\n  export const num = Math.random();\n  export function render() {\n    return `<button>\\`Click me!\\`</button>`;\n  }\n",
              l: 20,
              c: 1,
            },
          ],
          l: 19,
          c: 2,
        },
        {
          textContent: "\n",
          l: 25,
          c: 1,
        },
        {
          tagName: "script",
          attributes: [
            {
              name: "src",
              value: "./index.js",
              l: 25,
              c: 9,
            },
          ],
          l: 25,
          c: 2,
        },
        {
          textContent: "\n",
          l: 26,
          c: 1,
        },
      ])
    );
  });

  test("should parse a layout component file", async () => {
    const templateSourceFilePath = `${fixturesDirPath}layout.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          doctypeDeclaration: "html",
          l: 1,
          c: 1,
        },
        {
          textContent: "\n",
          l: 2,
          c: 1,
        },
        {
          tagName: "html",
          attributes: [
            {
              name: "lang",
              value: "en",
              l: 2,
              c: 7,
            },
          ],
          children: [
            {
              textContent: "\n  ",
              l: 3,
              c: 1,
            },
            {
              tagName: "head",
              children: [
                {
                  textContent: "\n    ",
                  l: 4,
                  c: 1,
                },
                {
                  tagName: "meta",
                  attributes: [
                    {
                      name: "charset",
                      value: "UTF-8",
                      l: 4,
                      c: 11,
                    },
                  ],
                  l: 4,
                  c: 6,
                },
                {
                  textContent: "\n    ",
                  l: 5,
                  c: 1,
                },
                {
                  tagName: "meta",
                  attributes: [
                    {
                      name: "name",
                      value: "viewport",
                      l: 5,
                      c: 11,
                    },
                    {
                      name: "content",
                      value: "width=device-width",
                      l: 5,
                      c: 27,
                    },
                  ],
                  l: 5,
                  c: 6,
                },
                {
                  textContent: "\n  ",
                  l: 6,
                  c: 1,
                },
              ],
              l: 3,
              c: 4,
            },
            {
              textContent: "\n  ",
              l: 7,
              c: 1,
            },
            {
              tagName: "body",
              children: [
                {
                  textContent: "\n    ",
                  l: 8,
                  c: 1,
                },
                {
                  tagName: "slot",
                  l: 8,
                  c: 6,
                },
                {
                  textContent: "\n  ",
                  l: 9,
                  c: 1,
                },
              ],
              l: 7,
              c: 4,
            },
            {
              textContent: "\n",
              l: 10,
              c: 1,
            },
          ],
          l: 2,
          c: 2,
        },
        {
          textContent: "\n",
          l: 11,
          c: 1,
        },
      ])
    );
  });

  test("should parse a component file containing multi-byte unicode characters", async () => {
    const templateSourceFilePath = `${fixturesDirPath}unicode.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "hey-👋",
          l: 1,
          c: 2,
          children: [
            {
              textContent:
                "\n  This is a valid web 🕸️ component name. At least, according to spec 🤷",
              l: 2,
              c: 1,
            },
            {
              tagName: "br",
              l: 2,
              c: 72,
            },
            {
              textContent: "\n  Check this out: 𐐷𝄞ЦѾئሐᏠ",
              l: 3,
              c: 1,
            },
            {
              tagName: "br",
              l: 3,
              c: 27,
            },
            {
              textContent: "\n  Just flexing my unicode muscles 💪\n",
              l: 4,
              c: 1,
            },
          ],
        },
        {
          textContent: "\n",
          l: 6,
          c: 1,
        },
      ])
    );
  });

  test("should ignore un-terminated opening tags", async () => {
    const templateSourceFilePath = `${fixturesDirPath}incompleteElement.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          textContent: "\nCheck this out: ",
          l: 2,
          c: 1,
        },
      ])
    );
  });

  test("should parse a utf-8 file with a byte order marker", async () => {
    const templateSourceFilePath = `${fixturesDirPath}utf8-bom.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "div",
          children: [
            {
              textContent: "Hello, world! 👋",
              l: 1,
              c: 6,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n",
          l: 2,
          c: 1,
        },
      ])
    );
  });

  test("should parse a utf-16 (little endian) file", async () => {
    const templateSourceFilePath = `${fixturesDirPath}utf16-le.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "div",
          children: [
            {
              textContent: "Hello, world! 👋",
              l: 1,
              c: 6,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n",
          l: 2,
          c: 1,
        },
      ])
    );
  });

  test("should parse a utf-16 (big endian) file", async () => {
    const templateSourceFilePath = `${fixturesDirPath}utf16-be.tmph.html`;
    const parsedTemplateNodes = await new HTMLParser().parse(
      templateSourceFilePath
    );

    assert.deepStrictEqual(
      parsedTemplateNodes,
      /** @satisfies {TmphNode[]} */ ([
        {
          tagName: "div",
          children: [
            {
              textContent: "Hello, world! 👋",
              l: 1,
              c: 6,
            },
          ],
          l: 1,
          c: 2,
        },
        {
          textContent: "\n",
          l: 2,
          c: 1,
        },
      ])
    );
  });

  test("throws error for a file which does not exist", async () => {
    const templateSourceFilePath = "THIS_DOES_NOT_EXIST.tmph.html";

    const parser = new HTMLParser();

    await assert.rejects(
      () => parser.parse(templateSourceFilePath),
      new Error(
        `ENOENT: no such file or directory, open '${templateSourceFilePath}'`
      )
    );
  });
});
