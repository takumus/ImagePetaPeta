import { Plugin } from "vite";

export default (pluginOptions?: {}): Plugin => {
  return {
    name: "worker-threads",
    enforce: "pre",
    transform(code, id, options) {
      const normalizedCodeString = code.replace(/\s+/g, " ");
      const pattern = /import\s+(\w+)\s+from\s+["'][^"']+\/(\w+\.!workerThread)["']/g;
      let match;
      const results: { file: string; variable: string }[] = [];
      while ((match = pattern.exec(normalizedCodeString)) !== null) {
        results.push({ file: match[2], variable: match[1] });
      }
      if (results.length > 0) {
        results.forEach((res) => {
          code = replaceWorkerThreadGroup(code, res.variable, `"${res.file}.mjs"`);
        });
        console.log("\nWT TRANSFORM!\n", code, "\n");
        return {
          code,
        };
      }
    },
  };
};
function replaceWorkerThreadGroup(code: string, name1: string, name2: string): string {
  const pattern = new RegExp(`createWorkerThreadsGroup\\(\\s*?(${name1})\\s*?\\)`, "g");
  return code.replace(pattern, `createWorkerThreadsGroup(${name2})`);
}
