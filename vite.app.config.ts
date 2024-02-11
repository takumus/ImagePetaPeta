import { rmSync } from "node:fs";
import { resolve } from "path";
import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import { viteAlias } from "./vite.alias";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import readdirr from "recursive-readdir";
import { debounce } from "throttle-debounce";
import { defineConfig, mergeConfig, UserConfigFnPromise } from "vite";
import electron, { ElectronOptions } from "vite-plugin-electron";

import vue from "@vitejs/plugin-vue";

export default defineConfig((async ({ command }) => {
  const isBuild = command === "build";
  if (isBuild) {
    rmSync("_release", { recursive: true, force: true });
  }
  const electronPlugin = await createElectronPlugin(isBuild);
  return {
    base: "./",
    root: resolve("./src/renderer"),
    publicDir: resolve("./src/_public"),
    build: {
      emptyOutDir: true,
      outDir: resolve("./_electronTemp/dist/renderer"),
      rollupOptions: {},
      minify: isBuild,
    },
    resolve: {
      alias: viteAlias,
    },
    plugins: [
      webWorker(),
      electronWindows({
        htmlDir: "./src/renderer/htmls",
        entryTSDirFromHTMLDir: "../windows",
        windows: windowNames.map((name) => ({
          name,
          templateHTMLFile: "./src/renderer/htmls/template.html",
        })),
      }),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("e-"),
          },
        },
      }),
      electronPlugin,
    ],
    clearScreen: false,
  };
}) as UserConfigFnPromise);

async function createElectronPlugin(isBuild: boolean) {
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) => file.endsWith(".!wt.ts"));
  const mainFile = resolve("./src/main/index.ts");
  const preloadFile = resolve("./src/main/preload.ts");
  console.log("WorkerThreadsFiles:", wtFiles);
  // const esmodules = (() => {
  //   let packages: string[] = [];
  //   const plugin = esmodule((esms) => {
  //     packages = esms.filter((esm) => !(esm in pkg.devDependencies));
  //     return packages;
  //   });
  //   return { plugin, packages };
  // })();
  const baseOptions: ElectronOptions = {
    vite: {
      // plugins: [esmodules.plugin],
      build: {
        minify: isBuild,
        outDir: resolve("./_electronTemp/dist/main"),
        rollupOptions: {
          external: [...Object.keys("dependencies" in pkg ? pkg.dependencies : {})],
        },
        sourcemap: !isBuild,
      },
      resolve: {
        alias: viteAlias,
      },
    },
  };
  const options: ElectronOptions[] = [];
  const restartDebounce = debounce(500, (f: () => void) => f());
  const tryRestart = (() => {
    let firstRestartCount = 0;
    return function tryRestart(name: string, restart: () => void) {
      restartDebounce(restart);
      // if (++firstRestartCount >= options.length) {
      //   console.log(`START[OK]: ${name}`);
      //   restartDebounce(restart);
      // } else {
      //   console.log(`START[SKIP]: ${name}`);
      // }
    };
  })();
  options.push(
    ...wtFiles.map<ElectronOptions>((file) =>
      mergeConfig<ElectronOptions, ElectronOptions>(baseOptions, {
        onstart(options) {
          tryRestart(file, options.startup);
        },
        vite: {
          build: {
            lib: {
              entry: file,
              formats: ["es"],
              fileName: () => "[name].mjs",
            },
          },
        },
      }),
    ),
  );
  options.push(
    mergeConfig<ElectronOptions, ElectronOptions>(baseOptions, {
      onstart(options) {
        tryRestart(mainFile, options.startup);
      },
      vite: {
        plugins: [workerThreads(), ...(baseOptions.vite?.plugins ?? [])],
        build: {
          lib: {
            entry: mainFile,
            formats: ["es"],
            fileName: () => "[name].mjs",
          },
        },
      },
    }),
  );
  options.push(
    mergeConfig<ElectronOptions, ElectronOptions>(baseOptions, {
      onstart(options) {
        // 最初のリロードはなぜかstartが呼ばれる仕様。
        tryRestart(preloadFile, options.reload);
      },
      vite: {
        build: {
          sourcemap: !isBuild ? "inline" : undefined, // #332
          lib: {
            entry: resolve(preloadFile),
            formats: ["cjs"],
            fileName: () => "[name].js",
          },
        },
      },
    }),
  );
  return electron(options);
}
