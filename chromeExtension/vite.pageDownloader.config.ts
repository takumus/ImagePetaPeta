import { rmSync } from "node:fs";
import { resolve } from "path";
import { defineConfig } from "vite";

// import nodePolyfills from "vite-plugin-node-stdlib-browser";

export default defineConfig({
  build: {
    minify: false,
    outDir: resolve("./_release/contents/pageDownloader"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
      },
    },
    lib: {
      entry: resolve("./src/contents/pageDownloader/index.ts"),
      name: "pageDownloader",
      formats: ["iife"],
      // fileName: "background",
    },
  },
  resolve: {
    alias: [
      { find: "$", replacement: resolve("./src/") },
      { find: "@", replacement: resolve("../src/") },
    ],
  },
  // plugins: [nodePolyfills()],
});
