import * as Path from "node:path";

import { ImportFileGroup } from "@/commons/datas/importFileGroup";

import { useLibraryPaths } from "@/main/provides/utils/paths";

export function getIdsFromFilePaths(datas: ImportFileGroup[]) {
  const paths = useLibraryPaths();
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
