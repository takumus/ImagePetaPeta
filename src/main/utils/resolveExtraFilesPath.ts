import * as Path from "path";
import { fileURLToPath } from "url";

export function resolveExtraFilesPath(...path: string[]) {
  if (process.platform === "darwin" && process.env.NODE_ENV !== "development") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = Path.dirname(__filename);
    return Path.resolve(__dirname, "../../../", ...path);
  }
  return Path.resolve(...path);
}
