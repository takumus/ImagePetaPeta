import { mkdirSync } from "node:fs";

mkdirSync("./_electronTemp", { recursive: true });
mkdirSync("./src/_public", { recursive: true });
mkdirSync("./src/_defines", { recursive: true });
