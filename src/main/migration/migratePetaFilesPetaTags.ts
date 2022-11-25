import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaFilesPetaTags = createMigrater<PetaFilePetaTag>(async (data, update) => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const anyData = data as any;
  if (data.petaFileId === undefined) {
    data.petaFileId = anyData.petaImageId;
    delete anyData.petaImageId;
    update();
  }
  return data;
});
