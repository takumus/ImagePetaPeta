import { resolve } from "node:path";
import { AliasOptions } from "vite";

export const viteAlias: AliasOptions = [{ find: "@", replacement: resolve("./src/") }];
