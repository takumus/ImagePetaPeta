import { mkdirSync } from "node:fs";
import { styleText } from "node:util";

console.log(styleText(["bgCyan", "black"], " [BEGIN] mkdir"));
mkdirSync("./_electronTemp", { recursive: true });
mkdirSync("./src/_public", { recursive: true });
mkdirSync("./src/_defines", { recursive: true });
console.log(styleText(["bgCyan", "black"], " [END] mkdir"));
