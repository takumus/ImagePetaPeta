import * as Path from "path";
export default function (path: string) {
  if (Path.resolve(path) === Path.resolve()) {
    return false;
  }
  return true;
}