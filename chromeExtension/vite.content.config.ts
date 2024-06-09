import { extname, resolve } from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve("./src/contents/ui"),
  publicDir: resolve("./src/contents/ui/public"),
  base: "./",
  build: {
    emptyOutDir: !process.argv.includes("--dev"),
    outDir: resolve("./dist/contents/ui"),
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
      plugins: [
        {
          name: "wrap-in-iife",
          generateBundle(outputOptions, bundle) {
            Object.keys(bundle).forEach((fileName) => {
              const file = bundle[fileName];
              if (extname(fileName) === ".js" && "code" in file) {
                file.code = `// (;o;)\n(() => {\n${file.code}})();`;
              }
            });
          },
        },
      ],
    },
  },
  resolve: {
    alias: [
      { find: "$", replacement: resolve("./src/") },
      { find: "@", replacement: resolve("../src/") },
    ],
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("e-"),
        },
      },
    }),
  ],
});
