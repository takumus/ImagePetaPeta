import { dirname } from "node:path";
import { fileURLToPath } from "url";

export function getDirname(url: string) {
  const __filename = fileURLToPath(url);
  return dirname(__filename);
}
