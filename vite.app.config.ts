import { rmSync } from "node:fs";
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
  }
  return createViteConfig({
    envDir: "../../",
    base: "./",
    root: resolve("./src/renderer"),
    publicDir: resolve("./src/_public"),
    build: {
      emptyOutDir: true,
      outDir: resolve("./_electronTemp/dist/renderer"),
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              // モジュール名を取得してチャンク名として返す
              return id.toString().split("node_modules/")[1].split("/")[0];
            }
          },
        },
      },
      minify: isBuild,
    },
    plugins: [
      webWorker(),
      electronWindows({
        templateHTMLFile: resolve("./src/renderer/template.html"),
        virtualDirFromRoot: ".", // 相対じゃないとダメ。
        windows: windowNames.reduce<{ [name: string]: string }>(
          (windows, name) => ({
            ...windows,
            [name]: resolve("./src/renderer/windows", name + ".ts"),
          }),
          {},
        ),
      }),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("e-"),
          },
        },
      }),
      createElectronPlugin(isBuild),
    ],
  });
}) as UserConfigFnPromise);

function createElectronPlugin(isBuild: boolean) {
  const viteConfig = createViteConfig({
    optimizeDeps: {
      exclude: ["sharp"],
    },
    build: {
      minify: isBuild,
      emptyOutDir: false,
      outDir: resolve("./_electronTemp/dist/main"),
      rollupOptions: {
        external: [...Object.keys(pkg.dependencies ?? {})],
      },
      sourcemap: !isBuild,
    },
  });
  const electronOptions: ElectronOptions = {
    vite: viteConfig,
  };
  const options: ElectronOptions[] = [];
  /** メインプロセス */
  options.push(
    mergeConfig<ElectronOptions, ElectronOptions>(electronOptions, {
      vite: {
        plugins: [
          workerThreads({
            config: cloneDeep(viteConfig),
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
  );
  /** プリロード */
  options.push(
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
  );
  return electron(options);
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
