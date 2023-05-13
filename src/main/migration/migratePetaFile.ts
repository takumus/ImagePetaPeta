import { rename } from "fs/promises";
import Path from "path";

import { PetaFile } from "@/commons/datas/petaFile";
import { PETAIMAGE_METADATA_VERSION } from "@/commons/defines";

import { createMigrater } from "@/main/libs/createMigrater";
import { mkdirIfNotIxists } from "@/main/libs/file";
import { usePaths } from "@/main/provides/utils/paths";
import { getPetaFileDirectoryPath, getPetaFilePath } from "@/main/utils/getPetaFileDirectory";

export const migratePetaFile = createMigrater<PetaFile>(async (data, update) => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const anyPetaFile = data as any;
  // v3.0.0
  if (data.metadata === undefined) {
    data.metadata = {
      type: "image",
      width: anyPetaFile.width,
      height: anyPetaFile.height,
      gif: false,
      palette: anyPetaFile.palette ?? [],
      version: 0,
    };
    delete anyPetaFile.width;
    delete anyPetaFile.height;
    delete anyPetaFile.palette;
    delete anyPetaFile.metadataVersion;
    update();
  }
  if (data.metadata.type === "image" && data.metadata.gif === undefined) {
    data.metadata.gif = false;
    update();
  }
  if (data.mimeType === undefined) {
    data.mimeType = "unknown/unknown";
    update();
  }
  if (data.metadata.type === "video" && data.metadata.duration === undefined) {
    data.metadata.duration = 0;
    update();
  }
  if (data.metadata.version < 1.8) {
    try {
      const paths = usePaths();
      const directory = getPetaFileDirectoryPath.fromPetaFile(data);
      const path = getPetaFilePath.fromPetaFile(data);
      await mkdirIfNotIxists(directory.original, { recursive: true });
      await mkdirIfNotIxists(directory.thumbnail, { recursive: true });
      await rename(Path.resolve(paths.DIR_IMAGES, data.file.original), path.original);
      await rename(Path.resolve(paths.DIR_THUMBNAILS, data.file.thumbnail), path.thumbnail);
    } catch {
      //
    }
    data.metadata.version = PETAIMAGE_METADATA_VERSION;
    update();
  }
  return data;
});
