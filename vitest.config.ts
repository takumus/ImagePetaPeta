import { mkdirSync, rmSync } from "node:fs";
import { builtinModules } from "node:module";
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
      workerThreads({
        files: (await readdirr(resolve("./src"))).filter((file) =>
          file.includes("!workerThreads."),
        ),
        config: {
          build: {
            outDir: resolve("./_test/_wt"),
            rollupOptions: {
              external: [
                ...Object.keys("dependencies" in pkg ? pkg.dependencies : {}),
                ...builtinModules,
              ],
            },
            minify: false,
          },
          resolve: {
            alias: viteAlias,
          },
        },
      }),
    ],
    resolve: {
      alias: viteAlias,
    },
  };
}) as UserConfigFnPromise);
