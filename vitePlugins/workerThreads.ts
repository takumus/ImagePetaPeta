import { Plugin } from "vite";

export default (pluginOptions?: {}): Plugin => {
  return {
    name: "worker-threads",
    transform(code, id, options) {
      if (/import.*?from.*?.*?\.!wt["']/g.exec(code)) {
        console.log("WorkerThreads:", id);
        const regexp = /import(.*?)from.*?(.*?\.!wt)["']/g;
        let result: RegExpExecArray | null;
        const workers: { name: string; file: string }[] = [];
        while ((result = regexp.exec(code))) {
          const name = result[1].trim();
          const file = result[2].trim().split("/").pop();
          if (file === undefined) {
            throw new Error("error");
          }
          workers.push({
            name,
            file,
          });
        }
        const root = process.env.TEST === "true" ? `"./_test/app/wt"` : "__dirname";
        const newCode =
          `import { Worker as __WT__ } from "worker_threads";\n` +
          `import { resolve as __RESOLVE__ } from "path";\n` +
          workers
            .map(
              (worker) =>
                `class ${worker.name} extends __WT__ { constructor() { super(__RESOLVE__(${root}, "${worker.file}.js")); } }\n`,
            )
            .join() +
          code.replace(/(import.*?from.*?.*?\.!wt["'])/g, "//$1");
        // console.log(newCode);
        return {
          code: newCode,
        };
      }
    },
  };
};
