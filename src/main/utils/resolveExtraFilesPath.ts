import * as Path from "path";

export function resolveExtraFilesPath(...path: string[]) {
  if (process.platform === "darwin" && process.env.NODE_ENV !== "development") {
    return Path.resolve(__dirname, "../../../", ...path);
  }
  return Path.resolve(...path);
}
