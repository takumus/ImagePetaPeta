import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import pkg from "./package.json";
import { viteAlias } from "./vite.alias";
import workerThreads from "./vitePlugins/workerThreads";
import readdirr from "recursive-readdir";
import { build, ElectronOptions } from "vite-plugin-electron";
import { defineConfig, mergeConfig, UserConfigFnPromise } from "vitest/config";

export default defineConfig((async ({ command }) => {
  rmSync("./_test", { recursive: true, force: true });
  mkdirSync("./_test", { recursive: true });
  const electronPlugin = await createElectronPlugin();
  return {
    test: {
      dir: "test",
      exclude: process.env.CI ? ["**/webhook.test.ts"] : [],
      testTimeout: 30 * 1000,
      threads: false,
      singleThread: true,
      isolate: true,
    },
    plugins: [
      workerThreads(),
      {
        name: "wt",
        apply: "serve",
        configureServer: async () => {
          electronPlugin.forEach((o) => {
            build(o);
          });
        },
      },
    ],
    resolve: {
      alias: viteAlias,
    },
  };
}) as UserConfigFnPromise);

async function createElectronPlugin() {
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) =>
    file.endsWith(".!workerThread.ts"),
  );
  console.log("WorkerThreadsFiles:", wtFiles);
  const electronConfig: ElectronOptions[] = wtFiles.map<ElectronOptions>((file) => ({
    // worker_threads
    vite: {
      build: {
        outDir: resolve("./_test/_wt"),
        rollupOptions: {
          external: Object.keys("dependencies" in pkg ? pkg.dependencies : {}),
        },
        lib: {
          entry: file,
          formats: ["es"],
          fileName: () => "[name].mjs",
        },
      },
      resolve: {
        alias: viteAlias,
      },
    },
  }));
  return electronConfig;
}
