import { PetaTag } from "@/commons/datas/petaTag";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaTag = createMigrater<PetaTag>(async (data) => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const anyPetaTag = data as any;
  anyPetaTag;
  return data;
});
