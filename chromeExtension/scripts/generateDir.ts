import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";

try {
  rmSync(resolve("./_release"), { force: true, recursive: true });
} catch {
  //
}
mkdirSync(resolve("./_release"), { recursive: true });
