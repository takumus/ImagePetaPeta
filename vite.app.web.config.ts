import { viteAlias } from "./vite.alias";
import webWorker from "./vitePlugins/webWorker";
import { resolve } from "path";
import { defineConfig } from "vite";

import vue from "@vitejs/plugin-vue";

export default defineConfig(async ({ command }) => {
  return {
    base: "./",
    root: resolve("./src/web"),
    build: {
      emptyOutDir: true,
      outDir: resolve("./_electronTemp/dist/web"),
      rollupOptions: {
        input: {
          sp: resolve("./src/web/index.html"),
        },
      },
      minify: true,
    },
    resolve: {
      alias: viteAlias,
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
    ],
    server: {
      host: true,
      port: 5174,
    },
    clearScreen: false,
  };
});