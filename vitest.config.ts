import pkg from "./package.json";
import { viteAlias } from "./vite.alias";
import workerThreads from "./vitePlugins/workerThreads";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import readdirr from "recursive-readdir";
import { defineConfig } from "vite";
import electron, { Configuration as ElectronConfig } from "vite-plugin-electron";

export default defineConfig(async ({ command }) => {
  rmSync("./_test", { recursive: true, force: true });
  mkdirSync("./_test", { recursive: true });
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) => file.endsWith(".!wt.ts"));
  console.log("WorkerThreadsFiles:", wtFiles);
  const electronBaseConfig: ElectronConfig = {
    vite: {
      build: {
        minify: false,
        outDir: resolve("./_test/_wt"),
        rollupOptions: {
          external: Object.keys("dependencies" in pkg ? pkg.dependencies : {}),
        },
      },
      resolve: {
        alias: viteAlias,
      },
    },
  };
  const electronConfig: ElectronConfig[] = [
    ...wtFiles.map((file) => ({
      // worker_threads
      ...electronBaseConfig,
      entry: file,
    })),
  ];
  console.log("CI:", process.env.CI);
  return {
    test: {
      dir: "test",
      exclude: process.env.CI ? ["**/webhook.test.ts"] : [],
      testTimeout: 30 * 1000,
      threads: false,
      singleThread: true,
      isolate: true,
      open: false,
    },
    plugins: [
      {
        name: "wt",
        apply: "serve",
        configureServer: () => {
          (electron(electronConfig)[1].closeBundle as any)();
        },
      },
      workerThreads(),
    ],
    resolve: {
      alias: viteAlias,
    },
  };
});
