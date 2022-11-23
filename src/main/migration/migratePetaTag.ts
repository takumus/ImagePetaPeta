import { PetaTag } from "@/commons/datas/petaTag";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaTag = createMigrater<PetaTag>(async (data) => {
  const anyPetaTag = data as any;
  return data;
});
