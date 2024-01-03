import { resolve } from "path";

import { getDirname } from "@/main/utils/dirname";

export function resolveExtraFilesPath(...path: string[]) {
  if (process.platform === "darwin" && process.env.NODE_ENV !== "development") {
    return resolve(getDirname(import.meta.url), "../../../", ...path);
  }
  return resolve(...path);
}
