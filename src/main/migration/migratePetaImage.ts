import { PetaImage } from "@/commons/datas/petaImage";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaImage = createMigrater<PetaImage>(async (data, update) => {
  const anyPetaImage = data as any;
  // v3.0.0
  if (data.metadata === undefined) {
    data.metadata = {
      type: "image",
      width: anyPetaImage.width,
      height: anyPetaImage.height,
      palette: anyPetaImage.palette ?? [],
      version: anyPetaImage.metadataVersion ?? 0,
    };
    delete anyPetaImage.width;
    delete anyPetaImage.height;
    delete anyPetaImage.palette;
    delete anyPetaImage.metadataVersion;
    update();
  }
  return data;
});
