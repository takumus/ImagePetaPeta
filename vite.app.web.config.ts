import { resolve } from "node:path";
import { viteAlias } from "./vite.alias";
import webWorker from "./vitePlugins/webWorker";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  root: resolve("./src/web"),
  // css: {
  //   preprocessorOptions: {
  //     scss: {
  //       api: "modern-compiler",
  //     },
  //   },
  // },
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
    react(),
  ],
  clearScreen: false,
});
