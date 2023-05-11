import * as Path from "path";

import { ImportFileGroup } from "@/commons/datas/importFileGroup";

import { usePaths } from "@/main/provides/utils/paths";

export function getIdsFromFilePaths(datas: ImportFileGroup[]) {
  const paths = usePaths();
  return datas
    .filter(
      (data) =>
        data[0]?.type === "filePath" &&
        Path.resolve(Path.dirname(data[0].filePath)).startsWith(Path.resolve(paths.DIR_IMAGES)),
    )
    .map(
      (data) =>
        Path.basename(data[0]?.type === "filePath" ? data[0].filePath : "?").split(".")[0] ?? "?",
    );
}
