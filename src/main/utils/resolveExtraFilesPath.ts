import * as Path from "path";

export function resolveExtraFilesPath(...path: string[]) {
  const additionalPath =
    process.platform === "darwin" && process.env.NODE_ENV === "production"
      ? [__dirname, "../../"]
      : [];
  return Path.resolve(...additionalPath, ...path);
}
