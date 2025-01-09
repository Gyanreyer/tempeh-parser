# Tempeh HTML Parser

A simple unopinionated HTML parser for Node applications.

## Usage

```ts
import { HTMLParser } from 'tempeh-html-parser';

const parser = new HTMLParser();

// Get the parsed nodes all at once as an array
const parsedNodes = await parser.parseFile("path/to/file.html").toArray();

// Process parsed nodes as they stream in
for await (const node of parser.parseFile("path/to/file.html")) {
  if (
    "attributes" in node &&
    node.attributes.some((attr) => attr.name === "id" && attr.value === "my-id")
   ) {
    console.log(`Found element ${node.tagName} with id "my-id"`);
  }
}
```

## API Reference

### HTMLParser

Parsing must be performed via an `HTMLParser` instance.

#### Constructor Options

##### `tagNameCasing: "lower" | "upper" | "preserve"`

Defaults to `"lower"`.

Determines how parsed tag names should be transformed.

`"lower"` will transform all tag names to lowercase, ie `<DIV />` will be parsed as `{ tagName: "div" }`.

```js
const parser = new HTMLParser({
  tagNameCasing: "lower",
});

// [
//   {
//     tagName: "div",
//     c: 2,
//     l: 1,
//   }
// ]
await parser.parseString(
  "<DIV />"
).toArray();
```

`"upper"` will transform all tag names to uppercase.

```js
const parser = new HTMLParser({
  tagNameCasing: "upper",
})

// [
//   {
//     tagName: "DIV",
//     c: 2,
//     l: 1,
//   }
// ]
await parser.parseString(
  "<div />"
).toArray();
```

`"preserve"` will preserve the casing of all tag names as written.

```js
const parser = new HTMLParser({
  tagNameCasing: "preserve",
});

// [
//   {
//     tagName: "Div",
//     c: 2,
//     l: 1,
//   }
// ]
await parser.parseString(
  "<Div />"
).toArray();
```

Note that in `"preserve"` mode, the casing of closing tags is also significant; if the casing between an opening and closing tag
don't match, the closing tag will be ignored, which is not the case in `"lower"` and `"upper"` modes.

```js
const parser = new HTMLParser({
  tagNameCasing: "preserve",
});

// [
//   {
//     tagName: "Div",
//     children: [{
//       // the "hello" text content is considered a child of the <Div> tag because
//       // </div> didn't terminate it due to mismatched casing
//       textContent: "hello",
//       c: 12,
//       l: 1,
//     }],
//     c: 2,
//     l: 1,
//   }
// ]
await parser.parseString(
  "<Div></div>hello"
).toArray();
```

##### `ignoreSelfClosingSyntax: boolean`

Defaults to `false`.

Determines whether parsing should ignore self-closing `/>` syntax on opening tags of non-void elements, ie `<div />`.

Self-closing syntax is a nice convenience which many are accustomed to from templating languages like JSX,
but it is not a part of the official HTML spec and is therefore ignored by browsers when parsing HTML.

Self-closing syntax is enabled by default since people generally like it, but you can opt out
if you are concerned with HTML spec compliance.

```js
const parser = new HTMLParser({
  ignoreSelfClosingSyntax: true,
});

// [
//   {
//     tagName: "div",
//     children: [
//       // the /> self-closing syntax was ignored, so the div was not terminated
//       // and the following text content node is considered a child of the div.
//       {
//         textContent: "Hello!",
//         c: 8,
//         l: 1,
//       }
//     ],
//     c: 2,
//     l: 1,
//   }
// ]
await parser.parseString(
  "<div />Hello!",
).toArray();
```

#### Methods

##### `parseFile(filePath: string)`

Parses an HTML file at a given file path.

```ts
const parser = new HTMLParser();
const parsedNodes = await parser.parseFile(
  "path/to/file.html"
).toArray();
```

##### `parseString(htmlString: string): HTMLParseResult`

Parses a raw HTML string.

```ts
const parser = new HTMLParser();
const parsedNodes = await parser.parseString(
  `<div>Hello, world!</div>`
).toArray();
```

### HTMLParseResult

Each parse call creates and returns an `HTMLParseResult` instance,
which can be used to consume the parser's stream. The values
from an `HTMLParseResult` can only be consumed once.

#### `toArray(): Promise<TmphNode[]>`

Waits for the parser stream to resolve and returns a full resolved array of the parsed nodes.

```ts
const parser = new HTMLParser();
const parseResult = parser.parseFile("my-file.html");

const parsedNodes = await parseResult.toArray();
```

#### Async Iterator

An `HTMLParseResult` instance can also be used as an async iterator to process parsed nodes as they stream in.
A streamed node will be over type `StreamedTmphNode`. This is notable because element nodes will be of type
`StreamedTmphElementNode` which will have a `childStream` to allow further streaming child nodes as opposed to a
final baked `children` array. This provides the ability to recursively process nodes at all levels of the tree
as they stream in.

```ts
const parser = new HTMLParser();
const parseResult = parser.parseFile("my-file.html");

for await (const node of parseResult) {
  // process node here

  if("childStream" in node) {
    for await (const childNode of node.childStream) {
      // process nested child nodes here
    }
  }
}
```

#### `used: boolean`

Whether this `HTMLParseResult` instance has already been consumed.
Because parsing is stream-based, a result can only be consumed once
and will throw errors on subsequence attempts to get values from it.

```ts
const parseResult = parser.parseFile("file.html");

// parseResult.used === false;
let nodes = await parseResult.toArray();

// parsedResult.used === true;
nodes = await parseResult.toArray();
// ^ throws: Error("HTMLParseResult instance has already been used")
```

## Type Reference

### `TmphElementNode`

Parsed representation of an HTML element node.

```ts
{
  // The tag name for the parsed HTML element.
  tagName: boolean;
  // Array of attributes on the parsed HTML element, if any were found.
  attributes?: TmphElementAttribute[];
  // Array of child nodes of the parsed HTML element.
  children?: TmphNode[];
  // Line number where this node was found in the source HTML.
  l: number;
  // Column number where this node was found in the source HTML.
  c: number;
}
```

### `TmphElementAttribute`

Parsed representation of an HTML element attribute.

```ts
{
  // Name of the parsed attribute.
  name: string;
  // Value of the parsed attribute.
  // Will be an empty string if no value was specified.
  value: string;
  // Line number where this attribute was found in the source HTML.
  l: number;
  // Column number where this attribute was found in the source HTML.
  c: number;
}
```

### `TmphTextNode`

Parsed representation of a snippet of child text in HTML.

```ts
{
  // The raw parsed text content. Note that whitespace is not trimmed, so any
  // line breaks and indentation from the original source will be preserved.
  textContent: string;
  // Line number where this text content was found in the source HTML.
  l: number;
  // Column number where this text content was found in the source HTML.
  c: number;
}
```

### `TmphDoctypeDeclarationNode`

Parsed representation of a `<!DOCTYPE>` declaration tag.

```ts
{
  // The declaration identifier string contents found in the declaration.
  // ie, for a `<!DOCTYPE html>` declaration, this value will be "html"
  doctypeDeclaration: string;
  // Line number where this declaration was found in the source HTML.
  l: number;
  // Column number where this declaration was found in the source HTML.
  c: number;
}
```

### `TmphNode`

Type representing all possible types of top-level nodes which can be
returned by the parser.

```ts
TmphElementNode | TmphTextNode | TmphDoctypeDeclarationNode
```

### `StreamedTmphElementNode`

Parsed representation of an HTML element node, but with a `ReadableStream` for recursively streaming
child nodes of the element as opposed to a fully baked `children` array.

```ts
{
 // The tag name for the parsed HTML element.
  tagName: boolean;
  // Array of attributes on the parsed HTML element, if any were found.
  attributes?: TmphElementAttribute[];
  // ReadableStream for streaming child nodes of the HTML element.
  childStream?: ReadableStream<StreamedTmphNode>;
  // Line number where this node was found in the source HTML.
  l: number;
  // Column number where this node was found in the source HTML.
  c: number;
}
```


### `StreamedTmphNode`

Type representing all possible types of top-level nodes which can be returned when
streaming nodes via an async iterator.

```ts
StreamedTmphElementNode | TmphTextNode | TmphDoctypeDeclarationNode | TmphCommentNode
```