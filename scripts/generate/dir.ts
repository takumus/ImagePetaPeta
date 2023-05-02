import { mkdirSync } from "fs";

mkdirSync("./electronTemp", { recursive: true });
mkdirSync("./src/_public", { recursive: true });
mkdirSync("./src/_defines", { recursive: true });
