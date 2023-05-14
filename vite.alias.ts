import { resolve } from "path";
import { AliasOptions } from "vite";

export const viteAlias: AliasOptions = [{ find: "@", replacement: resolve("./src/") }];
