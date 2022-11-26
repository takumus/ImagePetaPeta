import { PetaFile } from "@/commons/datas/petaFile";

import { createMigrater } from "@/main/libs/createMigrater";

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
      version: anyPetaFile.metadataVersion ?? 0,
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
  return data;
});
