import { rmSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import { viteAlias } from "./vite.alias";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import cloneDeep from "lodash.clonedeep";
import { defineConfig, mergeConfig, UserConfig, UserConfigFnPromise } from "vite";
import electron, { ElectronOptions } from "vite-plugin-electron";

import vue from "@vitejs/plugin-vue";

export default defineConfig((async ({ command }) => {
  const isBuild = command === "build";
  if (isBuild) {
    rmSync("_release", { recursive: true, force: true });
    rmSync("_electronTemp/dist", { recursive: true, force: true });
  }
  return createViteConfig({
    envDir: "../../",
    base: "./",
    root: resolve("./src/renderer"),
    publicDir: resolve("./src/_public"),
    build: {
      emptyOutDir: true,
      outDir: resolve("./_electronTemp/dist/renderer"),
      minify: isBuild,
    },
    plugins: [
      webWorker(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("e-"),
          },
        },
      }),
      electrons(isBuild),
    ],
  });
}) as UserConfigFnPromise);

function electrons(isBuild: boolean) {
  const electronOptions: ElectronOptions = {
    vite: createViteConfig({
      optimizeDeps: {
        exclude: ["sharp"],
      },
      build: {
        minify: isBuild ? "esbuild" : undefined,
        emptyOutDir: false,
        outDir: resolve("./_electronTemp/dist/main"),
        rollupOptions: {
          external: [
            ...Object.keys(pkg.dependencies ?? {}),
            ...builtinModules,
            ...builtinModules.map((m) => `node:${m}`),
          ],
        },
        sourcemap: !isBuild,
      },
    }),
  };
  const windows = electronWindows({
    templateHTMLFile: resolve("./src/renderer/windows/@template.html"),
    windows: windowNames.map((name) => ({
      templateReplace: { ts: resolve(`./src/renderer/windows/${name}.ts`) },
      virtualHTML: resolve(`./src/renderer/windows/${name}.html`),
    })),
  });
  const builder = electron([
    // main process
    mergeConfig<ElectronOptions, ElectronOptions>(electronOptions, {
      vite: {
        plugins: [
          workerThreads({
            config: cloneDeep(electronOptions.vite),
          }),
        ],
        build: {
          lib: {
            entry: resolve("./src/main/index.ts"),
            formats: ["es"],
            fileName: () => "[name].mjs",
          },
        },
      },
      onstart(args) {
        args.startup([".", "--sourcemap", "--inspect=9229"]);
      },
    }),
    // preload
    mergeConfig<ElectronOptions, ElectronOptions>(electronOptions, {
      vite: {
        build: {
          sourcemap: !isBuild ? "inline" : undefined, // #332
          lib: {
            entry: resolve("./src/main/preload.ts"),
            formats: ["cjs"],
            fileName: () => "[name].cjs",
          },
        },
      },
    }),
  ]);

  return [builder, windows];
}

function createViteConfig(config: UserConfig) {
  return mergeConfig<UserConfig, UserConfig>(
    {
      resolve: {
        alias: viteAlias,
      },
      clearScreen: false,
    },
    config,
  );
}
