import { readFileSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { styleText } from "node:util";
import { build, mergeConfig, Plugin, ResolvedConfig, UserConfig } from "vite";

export default (pluginOptions: { config?: UserConfig }): Plugin => {
  let baseConfig: ResolvedConfig;
  let mode = "";
  let workerFiles: { [id: string]: boolean } = {};
  async function buildWorkerThreadFile(workerfile: string, onUpdate: () => void) {
    if (workerFiles[workerfile] !== undefined) {
      return;
    }
    workerFiles[workerfile] = true;
    let init = true;
    const config = mergeConfig<UserConfig, UserConfig>(pluginOptions.config ?? {}, {
      build: {
        emptyOutDir: false,
        lib: {
          entry: workerfile,
          formats: ["es"],
          fileName: () => "[name].mjs",
        },
        rollupOptions: {
          external: [...builtinModules],
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
            log("updated", workerfile);
            onUpdate();
          },
        },
      ],
    });
    if (mode === "production" || mode === "test") {
      await build(config);
    } else {
      build(mergeConfig<UserConfig, UserConfig>(config, { build: { watch: {} } }));
    }
  }
  return {
    name: "worker-threads",
    enforce: "pre",
    apply(_config, env) {
      log("apply", env.mode);
      mode = env.mode;
      return true;
    },
    configResolved(resolvedConfig) {
      baseConfig = resolvedConfig;
    },
    buildStart() {
      log("buildStart");
      workerFiles = {};
    },
    async transform(code, id, options) {
      const pattern = /import\(\s*?["'].*(!workerThreads\..*)["']\s*?\)/g;
      const pattern2 = /import\(\s*?["'](.*!workerThreads\..*)["']\s*?\)/g;
      let match: RegExpExecArray | null;
      let newCode = code;
      let replaced = false;
      while ((match = pattern.exec(code))) {
        newCode = newCode.replace(match[0], `"${match[1]}.mjs"`);
        replaced = true;
        log("transformed", id);
      }
      let match2: RegExpExecArray | null;
      while ((match2 = pattern2.exec(code))) {
        const path = match2?.[1];
        if (path) {
          for (const { find, replacement } of baseConfig.resolve.alias) {
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

function log(...args: any[]) {
  console.log(styleText("yellow", "[vite-plugin:workerThreads]"), ...args);
}
