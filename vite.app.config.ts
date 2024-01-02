import { rmSync } from "node:fs";
import { resolve } from "path";
import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import { viteAlias } from "./vite.alias";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import readdirr from "recursive-readdir";
import { throttle } from "throttle-debounce";
import { defineConfig, UserConfigFnPromise } from "vite";
import electron, { ElectronOptions } from "vite-plugin-electron";
import esmodule from "vite-plugin-esmodule";

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
  console.log("WorkerThreadsFiles:", wtFiles);
  const esmodules = (() => {
    let packages: string[] = [];
    const plugin = esmodule((esms) => {
      packages = esms.filter((esm) => !(esm in pkg.devDependencies));
      return packages;
    });
    return { plugin, packages };
  })();
  const baseOptions: ElectronOptions = {
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
        sourcemap: !isBuild,
      },
      resolve: {
        alias: viteAlias,
      },
    },
  };
  const options: ElectronOptions[] = [];
  const restart = throttle(2000, (f: () => void) => f());
  restart(() => undefined);
  options.push(
    ...wtFiles.map<ElectronOptions>((file) => ({
      ...baseOptions,
      entry: file,
      onstart(options) {
        restart(() => options.startup());
      },
    })),
  );
  options.push({
    ...baseOptions,
    onstart(options) {
      restart(() => options.startup());
    },
    vite: {
      ...baseOptions.vite,
      plugins: [workerThreads(), ...(baseOptions.vite?.plugins ?? [])],
      build: {
        ...baseOptions.vite?.build,
        lib: {
          entry: resolve("./src/main/index.ts"),
          formats: ["es"],
          fileName: () => "[name].js",
        },
      },
    },
  });
  options.push({
    ...baseOptions,
    onstart(options) {
      options.reload();
    },
    vite: {
      ...baseOptions.vite,
      build: {
        ...baseOptions.vite?.build,
        sourcemap: !isBuild ? "inline" : undefined, // #332
        lib: {
          entry: resolve("./src/main/preload.ts"),
          formats: ["cjs"],
          fileName: () => "[name].js",
        },
      },
    },
  });
  return electron(options);
}
