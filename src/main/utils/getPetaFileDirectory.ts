import Path from "path";

import { PetaFile } from "@/commons/datas/petaFile";

import { usePaths } from "@/main/provides/utils/paths";

export function getPetaFileDirectoryPath(petaFile: PetaFile) {
  return getPetaFileDirectoryPathFromID(petaFile.id);
}
export function getPetaFileDirectoryPathFromID(petaFileID: string) {
  const paths = usePaths();
  const dir1 = petaFileID.substring(0, 2);
  const dir2 = petaFileID.substring(2, 4);
  return {
    original: Path.resolve(paths.DIR_IMAGES, dir1, dir2),
    thumbnail: Path.resolve(paths.DIR_THUMBNAILS, dir1, dir2),
  };
}
export function getPetaFilePath(petaFile: PetaFile) {
  const directory = getPetaFileDirectoryPath(petaFile);
  return {
    original: Path.resolve(directory.original, petaFile.file.original),
    thumbnail: Path.resolve(directory.thumbnail, petaFile.file.thumbnail),
  };
}
export function getPetaFilePathFromIDAndFilename(
  id: string,
  filename: string,
  type: "thumbnail" | "original",
) {
  const directory = getPetaFileDirectoryPathFromID(id);
  return Path.resolve(directory[type], filename);
}
