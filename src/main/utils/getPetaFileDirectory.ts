import Path from "path";

import { PetaFile } from "@/commons/datas/petaFile";

import { usePaths } from "@/main/provides/utils/paths";

export const getPetaFileDirectoryPath = {
  fromPetaFile: (petaFile: PetaFile) => getPetaFileDirectoryPath.fromID(petaFile.id),
  fromID(petaFileID: string) {
    const paths = usePaths();
    const dir1 = petaFileID.substring(0, 2);
    const dir2 = petaFileID.substring(2, 4);
    return {
      original: Path.resolve(paths.DIR_IMAGES, dir1, dir2),
      thumbnail: Path.resolve(paths.DIR_THUMBNAILS, dir1, dir2),
      cache: Path.resolve(paths.DIR_CACHE, dir1, dir2),
    };
  },
} as const;

export const getPetaFilePath = {
  fromPetaFile: (petaFile: PetaFile) => {
    const directory = getPetaFileDirectoryPath.fromPetaFile(petaFile);
    return {
      original: Path.resolve(directory.original, petaFile.file.original),
      thumbnail: Path.resolve(directory.thumbnail, petaFile.file.thumbnail),
    };
  },
  fromIDAndFilename(id: string, filename: string, type: "thumbnail" | "original") {
    const directory = getPetaFileDirectoryPath.fromID(id);
    return Path.resolve(directory[type], filename);
  },
} as const;
