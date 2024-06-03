import { build, InlineConfig, mergeConfig, Plugin } from "vite";

export default (pluginOptions: { files: string[]; config?: InlineConfig }): Plugin => {
  return {
    name: "worker-threads",
    enforce: "pre",
    transform(code, id, options) {
      const pattern = /import\(\s*?["'].*(!workerThreads\..*)["']\s*?\)/g;
      let match: RegExpExecArray | null;
      let newCode = code;
      let replaced = false;
      while ((match = pattern.exec(code))) {
        if (pluginOptions.files.find((file) => file.includes(match?.[1] ?? "")) !== undefined) {
          newCode = newCode.replace(match[0], `"${match[1]}.mjs"`);
          replaced = true;
          console.log("\nWorkerThreadsTransformed:\n", id, match[1], "\n");
        }
      }
      if (replaced) {
        return {
          code: newCode,
        };
      }
    },
    buildStart() {
      console.log("WorkerThreadsFiles:", pluginOptions.files);
      build(
        mergeConfig(
          {
            build: {
              lib: {
                entry: pluginOptions.files,
                formats: ["es"],
                fileName: () => "[name].mjs",
              },
            },
          },
          pluginOptions.config ?? {},
        ),
      );
    },
  };
};
