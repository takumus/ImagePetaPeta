import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import { viteAlias } from "./vite.alias";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import { rmSync } from "node:fs";
import { resolve } from "path";
import readdirr from "recursive-readdir";
import { defineConfig } from "vite";
import electron, { ElectronOptions } from "vite-plugin-electron";
import esmodule from "vite-plugin-esmodule";

import vue from "@vitejs/plugin-vue";

export default defineConfig(async ({ command }) => {
  const isServe = command === "serve";
  const isBuild = command === "build";
  if (isBuild) {
    rmSync("_release", { recursive: true, force: true });
  }
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  const esmodules = (() => {
    let packages: string[] = [];
    const plugin = esmodule((esms) => {
      packages = esms.filter((esm) => !(esm in pkg.devDependencies));
      return packages;
    });
    return { plugin, packages };
  })();
  const electronBaseConfig: ElectronOptions = {
    vite: {
      plugins: [esmodules.plugin],
      build: {
        minify: isBuild,
        outDir: resolve("./_electronTemp/dist/main"),
        rollupOptions: {
          external: [
            ...Object.keys("dependencies" in pkg ? pkg.dependencies : {}).filter(
              (pkg) => !esmodules.packages.includes(pkg),
            ),
          ],
        },
        sourcemap,
      },
      resolve: {
        alias: viteAlias,
      },
    },
  };
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) => file.endsWith(".!wt.ts"));
  console.log("WorkerThreadsFiles:", wtFiles);
  const electronConfig: ElectronOptions[] = [
    // worker_threads
    ...wtFiles.map((file) => ({
      ...electronBaseConfig,
      entry: file,
    })),
    // main
    {
      ...electronBaseConfig,
      entry: resolve("./src/main/index.ts"),
      onstart(options) {
        if (process.env.VSCODE_DEBUG) {
          console.log("[startup] Electron App");
        } else {
          options.startup();
        }
      },
      vite: {
        ...electronBaseConfig.vite,
        plugins: [workerThreads(), ...(electronBaseConfig.vite?.plugins ?? [])],
      },
    },
    // preload
    {
      ...electronBaseConfig,
      entry: resolve("./src/main/preload.ts"),
      onstart(options) {
        options.reload();
      },
      vite: {
        ...electronBaseConfig.vite,
        build: {
          ...electronBaseConfig.vite?.build,
          sourcemap: sourcemap ? "inline" : undefined, // #332
        },
      },
    },
  ];
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
      electron(electronConfig),
    ],
    server: {
      host: true,
    },
    clearScreen: false,
  };
});
