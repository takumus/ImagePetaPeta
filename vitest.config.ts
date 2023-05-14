/// <reference types="vitest" />
import pkg from "./package.json";
import workerThreads from "./vitePlugins/workerThreads";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import readdirr from "recursive-readdir";
import { AliasOptions, defineConfig } from "vite";
import electron, { Configuration as ElectronConfig } from "vite-plugin-electron";
import esmodule from "vite-plugin-esmodule";

const alias: AliasOptions = [{ find: "@", replacement: resolve("./src/") }];
export default defineConfig(async ({ command }) => {
  rmSync("./_test", { recursive: true, force: true });
  mkdirSync("./_test", { recursive: true });
  const esmodules = (() => {
    let packages: string[] = [];
    const plugin = esmodule((esms) => {
      packages = esms.filter((esm) => !(esm in pkg.devDependencies));
      return packages;
    });
    return { plugin, packages };
  })();
  const isServe = command === "serve";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  const wtFiles = (await readdirr(resolve("./src"))).filter((file) => file.endsWith("!wt.ts"));
  console.log("WorkerThreadsFiles:", wtFiles);
  const electronBaseConfig: ElectronConfig = {
    vite: {
      plugins: [esmodules.plugin],
      build: {
        outDir: resolve("./_test/scenario/wt"),
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
  ];
  return {
    test: {
      dir: "test",
      testTimeout: 30 * 1000,
      threads: false,
    },
    plugins: [
      {
        name: "wt",
        apply: "serve",
        configureServer: (s) => {
          (electron(electronConfig)[1].closeBundle as any)();
        },
      },
      workerThreads(),
    ],
    resolve: {
      alias,
    },
  };
});
