import { rmSync } from "node:fs";
import { resolve } from "path";
import pkg from "./package.json";
import { windowNames } from "./src/commons/windows";
import { viteAlias } from "./vite.alias";
import electronWindows from "./vitePlugins/electronWindows";
import webWorker from "./vitePlugins/webWorker";
import workerThreads from "./vitePlugins/workerThreads";
import readdirr from "recursive-readdir";
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
    resolve: {
      alias: viteAlias,
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
  const baseOptions: ElectronOptions = {
    vite: {
      optimizeDeps: {
        exclude: ["sharp"],
      },
      build: {
        minify: isBuild,
        outDir: resolve("./_electronTemp/dist/main"),
        rollupOptions: {
          external: [...Object.keys(pkg.dependencies ?? {})],
        },
        sourcemap: !isBuild,
      },
      resolve: {
        alias: viteAlias,
      },
    },
  };
  const options: ElectronOptions[] = [];
  options.push(
    ...wtFiles.map<ElectronOptions>((file) =>
      mergeConfig<ElectronOptions, ElectronOptions>(baseOptions, {
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
      vite: {
        build: {
          sourcemap: !isBuild ? "inline" : undefined, // #332
          lib: {
            entry: resolve(preloadFile),
            formats: ["cjs"],
            fileName: () => "[name].cjs",
          },
        },
      },
    }),
  );
  return electron(options);
}
