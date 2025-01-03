import { readdir, stat } from "node:fs/promises";
import { HTMLParser } from "../src/index.js";
import path from "node:path";

const FILE_PREFIX_LENGTH = "file://".length;

/**
 * @param {string} path
 */
function resolveRelativePath(path) {
  return import.meta.resolve(path).slice(FILE_PREFIX_LENGTH);
}

const fixturesDirPath = resolveRelativePath("../test/fixtures/");

const testFixtureFilePaths = await readdir(fixturesDirPath).then((fileNames) =>
  fileNames
    // .filter(
    //   (fileName) =>
    //     fileName !== "componentWithAsyncAttributes.tmph.html" &&
    //     fileName !== "geyer.dev.tmph.html" &&
    //     fileName !== "incompleteElement.tmph.html" &&
    //     fileName !== "inlineSubComponents.tmph.html" &&
    //     fileName === "layout.tmph.html" &&
    //     fileName !== "unicode.tmph.html"
    // )
    .map((fileName) => path.join(fixturesDirPath, fileName))
);

// const totalMemory = os.totalmem() >> 10;

// const initialMemoryUse = totalMemory - (os.freemem() >> 10);

/**
 *
 * @param {string} context
 */
// const logMemoryUsage = (context) => {
//   console.log(
//     `Memory used (${context}): ${
//       totalMemory - (os.freemem() >> 10) - initialMemoryUse
//     }KB`
//   );
// };
// let memoryCheckID = setImmediate(function checkMemLoop() {
//   logMemoryUsage("interval");
//   memoryCheckID = setImmediate(checkMemLoop);
// });

// const startTemplateParserServerStartTime = performance.now();
// const parserServerOrigin = await startTemplateParserServer();
// const startTemplateParserServerEndTime = performance.now();
// console.log(
//   `startTemplateParserServer: ${
//     startTemplateParserServerEndTime - startTemplateParserServerStartTime
//   }ms`
// );

// if (!parserServerOrigin) {
//   throw new Error("Template parser server not running");
// }

// logMemoryUsage("after starting server");

// const timings = new Map();

// const parseAllTemplatesStartTime = performance.now();

let averageTimings = 0;
let averageTimesPerKB = 0;

const parser = new HTMLParser();

for (const filePath of testFixtureFilePaths) {
  const fileSize = (await stat(filePath)).size / 1024;
  const runCount = Math.round(5 + Math.random() * 10);
  let totalTime = 0;
  for (let i = 0; i < runCount; ++i) {
    const startTime = performance.now();

    await parser.parseFile(filePath).toArray();

    const parseTemplateEndTime = performance.now();
    totalTime += parseTemplateEndTime - startTime;
  }

  const averageTime = totalTime / runCount;
  averageTimings += averageTime;

  averageTimesPerKB += averageTime / fileSize;

  console.log(
    `Average time for ${runCount} runs parsing ${filePath}: ${averageTime}ms; ${
      averageTime / fileSize
    }ms/KB`
  );
}

console.log(
  `\nAverage time for all templates: ${
    averageTimings / testFixtureFilePaths.length
  }ms; ${averageTimesPerKB / testFixtureFilePaths.length}ms/KB`
);

// console.log("Individual parseTemplate timings", timings);
// const parseAllTemplatesEndTime = performance.now();
// console.log(
//   "total parsing time:",
//   `${parseAllTemplatesEndTime - parseAllTemplatesStartTime}ms;`,
//   "average:",
//   `${
//     (parseAllTemplatesEndTime - parseAllTemplatesStartTime) /
//     testFixtureFilePaths.length
//   }ms`
// );

// cleanupWorkers();

// stopTemplateParserServer();

// clearImmediate(memoryCheckID);
// logMemoryUsage("after parsing");
