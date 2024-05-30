import { readFileSync } from "node:fs";
import recursiveReadDir from "recursive-readdir";

import { defaultStyles } from "@/renderer/styles/styles";

(async () => {
  const files = (await recursiveReadDir("./src")).filter((file) => file.endsWith(".vue"));
  const errors: string[] = [];
  files.forEach((file) => {
    const source = readFileSync(file).toString();
    source
      .match(/var\(--([a-zA-Z0-9\-]+)\)/g)
      ?.map((str) => str.replace(/(var\()|(\))/g, ""))
      .forEach((variable) => {
        if ((defaultStyles.dark as any)[variable] === undefined) {
          errors.push(`var(${variable}) is not found. ${file}`);
        }
      });
  });
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  process.exit(0);
})();
