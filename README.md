# Tempeh HTML Parser

A fairly-well-optimized HTML parser for Node applications.

## Basic usage

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