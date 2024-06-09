import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";

try {
  rmSync(resolve("./dist"), { force: true, recursive: true });
} catch {
  //
}
mkdirSync(resolve("./dist"), { recursive: true });
