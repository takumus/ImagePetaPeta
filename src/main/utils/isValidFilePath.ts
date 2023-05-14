import * as Path from "path";

export function isValidPetaFilePath(path: string) {
  if (Path.resolve(path).startsWith(Path.resolve())) {
    return false;
  }
  return true;
}
