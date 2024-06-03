import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build, InlineConfig, mergeConfig, Plugin, ResolvedConfig } from "vite";

export default (pluginOptions: { files: string[]; config?: InlineConfig }): Plugin => {
  let config: ResolvedConfig;
  let mode = "";
  let workerFiles: { [id: string]: boolean } = {};
  async function buildWorkerThreadFile(workerfile: string, onUpdate: () => void) {
    if (workerFiles[workerfile] !== undefined) {
      return;
    }
    workerFiles[workerfile] = true;
    let init = true;
    const config = mergeConfig<InlineConfig, InlineConfig>(pluginOptions.config ?? {}, {
      build: {
        emptyOutDir: false,
        lib: {
          entry: workerfile,
          formats: ["es"],
          fileName: () => "[name].mjs",
        },
      },
      plugins: [
        {
          name: "re-save-parent-file",
          closeBundle() {
            if (init) {
              init = false;
              return;
            }
            console.log("updated");
            onUpdate();
          },
        },
      ],
    });
    if (mode === "production") {
      await build(config);
    } else {
      build(mergeConfig<InlineConfig, InlineConfig>(config, { build: { watch: {} } }));
    }
  }
  return {
    name: "worker-threads",
    enforce: "pre",
    apply(_config, env) {
      // console.log("APPLY", env.mode);
      mode = env.mode;
      return true;
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      console.log("worker-threads buildStart");
      workerFiles = {};
    },
    async transform(code, id, options) {
      const pattern = /import\(\s*?["'].*(!workerThreads\..*)["']\s*?\)/g;
      const pattern2 = /import\(\s*?["'](.*!workerThreads\..*)["']\s*?\)/g;
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
      let match2: RegExpExecArray | null;
      while ((match2 = pattern2.exec(code))) {
        const path = match2?.[1];
        if (path) {
          for (const { find, replacement } of config.resolve.alias) {
            const aliasString = typeof find === "string" ? find : find.source;
            if (path.startsWith(aliasString)) {
              const workerfile = resolve(path.replace(aliasString, replacement));
              await buildWorkerThreadFile(workerfile, () => {
                try {
                  writeFileSync(id, readFileSync(id));
                } catch {
                  //
                }
              });
            }
          }
        }
      }
      if (replaced) {
        return {
          code: newCode,
        };
      }
    },
  };
};
