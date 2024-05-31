import { Plugin } from "vite";

export default (pluginOptions?: {}): Plugin => {
  return {
    name: "worker-threads",
    enforce: "pre",
    transform(code, id, options) {
      const pattern = /import\(\s*?["'].*(!workerThreads\..*)["']\s*?\)/g;
      let match: RegExpExecArray | null;
      let newCode = code;
      let replaced = false;
      while ((match = pattern.exec(code))) {
        newCode = newCode.replace(match[0], `"${match[1]}.mjs"`);
        replaced = true;
      }
      if (replaced) {
        console.log("\nWorkerThreadsTransformed:\n", newCode, "\n");
        return {
          code: newCode,
        };
      }
    },
  };
};
