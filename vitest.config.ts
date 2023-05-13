/// <reference types="vitest" />
import { resolve } from "path";
import { AliasOptions, defineConfig } from "vite";

const alias: AliasOptions = [{ find: "@", replacement: resolve("./src/") }];
export default defineConfig({
  test: {
    include: ["test/**/**test.ts"],
  },
  resolve: {
    alias,
  },
});
