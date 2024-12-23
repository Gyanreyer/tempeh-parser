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

```ts
const parser = new HTMLParser();
const parseResult = parser.parseFile("my-file.html");

for await (const node of parseResult) {
  // process node here
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