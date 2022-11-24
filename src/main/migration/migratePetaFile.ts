import { PetaFile } from "@/commons/datas/petaFile";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaFile = createMigrater<PetaFile>(async (data, update) => {
  const anyPetaFile = data as any;
  // v3.0.0
  if (data.metadata === undefined) {
    data.metadata = {
      type: "image",
      width: anyPetaFile.width,
      height: anyPetaFile.height,
      palette: anyPetaFile.palette ?? [],
      version: anyPetaFile.metadataVersion ?? 0,
    };
    delete anyPetaFile.width;
    delete anyPetaFile.height;
    delete anyPetaFile.palette;
    delete anyPetaFile.metadataVersion;
    update();
  }
  return data;
});
