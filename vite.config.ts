import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import { rmSync } from "node:fs";
import { resolve } from "path";
import readdirr from "recursive-readdir";
import { AliasOptions, defineConfig } from "vite";
import electron, { Configuration as ElectronConfig } from "vite-plugin-electron";
import esmodule from "vite-plugin-esmodule";

import vue from "@vitejs/plugin-vue";

const alias: AliasOptions = [{ find: "@", replacement: resolve("./src/") }];

export default defineConfig(async ({ command }) => {
  rmSync("_electronTemp/dist", { recursive: true, force: true });
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
  const electronBaseConfig: ElectronConfig = {
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
      },
      resolve: {
        alias,
      },
    },
  };
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) => file.endsWith("!wt.ts"));
  console.log("WorkerThreadsFiles:", wtFiles);
  const electronConfig: ElectronConfig[] = [
    ...wtFiles.map((file) => ({
      // worker_threads
      ...electronBaseConfig,
      entry: file,
      vite: {
        ...electronBaseConfig.vite,
        build: {
          ...electronBaseConfig.vite?.build,
          sourcemap,
        },
      },
    })),
    {
      // main
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
        build: {
          ...electronBaseConfig.vite?.build,
          sourcemap,
        },
      },
    },
    {
      // preload
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
    root: resolve("./src/renderer"),
    publicDir: resolve("./src/_public"),
    build: {
      outDir: resolve("./_electronTemp/dist/renderer"),
      rollupOptions: {},
      minify: isBuild,
    },
    resolve: {
      alias,
    },
    plugins: [
      webWorker(),
      // tsconfigPaths({ loose: true }),
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
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port,
        };
      })(),
    clearScreen: false,
  };
});
