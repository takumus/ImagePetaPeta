import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

(async () => {
  const debuggers = `export const DEBUGGERS = ${JSON.stringify(
    readFileSync(resolve("./resources/debuggers.txt"))
      .toString()
      .split(/\r\n|\n|\r/g)
      .map((name) => name.trim())
      .filter((name) => name !== ""),
    undefined,
    2,
  )};`;
  writeFileSync("./src/@assets/debuggers.ts", debuggers);
})();
