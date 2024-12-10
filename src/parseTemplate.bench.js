import { readdir, stat } from "node:fs/promises";
import { parseTemplate } from "./parseTemplate.js";
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
  fileNames.map((fileName) => path.join(fixturesDirPath, fileName))
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

for (const filePath of testFixtureFilePaths) {
  const fileSize = (await stat(filePath)).size / 1024;
  const runCount = Math.round(5 + Math.random() * 10);
  let totalTime = 0;
  for (let i = 0; i < runCount; ++i) {
    const startTime = performance.now();
    const stream = parseTemplate(filePath);
    const reader = stream.getReader();

    // Read until the stream is done
    while (!(await reader.read()).done) {}

    const parseTemplateEndTime = performance.now();
    totalTime += parseTemplateEndTime - startTime;
    reader.releaseLock();
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
