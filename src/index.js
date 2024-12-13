import { Piscina } from "piscina";
import { MessageChannel } from "node:worker_threads";

const pool = new Piscina({
  filename: import.meta.resolve("./parseTemplate.worker.js"),
});

/**
 * Takes the path to an HTML file and parses it into JSON. This function is an
 * async generator that yields root-level nodes from the parsed file as they stream in.
 *
 * @param {string} filePath
 *
 * @example
 * const nodes = [];
 * for await (const node of parseTemplate("path/to/file.tmph.html")) {
 *  nodes.push(node);
 * }
 * console.log("My nodes!", nodes);
 */
export async function* parseTemplate(filePath) {
  const { port1, port2 } = new MessageChannel();

  const runPromise = pool.run(
    { filePath, messagePort: port2 },
    { transferList: [port2] }
  );

  while (true) {
    const nextToken = await new Promise((resolve, reject) => {
      /**
       * @param {import("./templateData").TmphNode} message
       */
      const onMessage = (message) => {
        cleanupListeners();
        if (message instanceof Error) {
          port1.close();
          reject(message);
        } else {
          resolve(message);
        }
      };
      /**
       * @param {Error} error
       */
      const onMessageError = (error) => {
        cleanupListeners();
        reject(error);
      };
      const onClose = () => {
        cleanupListeners();
        resolve(null);
      };
      function cleanupListeners() {
        port1.off("message", onMessage);
        port1.off("messageerror", onMessageError);
        port1.off("close", onClose);
      }

      port1.on("message", onMessage);
      port1.on("messageerror", onMessageError);
      port1.on("close", onClose);
    });

    if (!nextToken) {
      break;
    }
    yield nextToken;
  }

  await runPromise;
}
