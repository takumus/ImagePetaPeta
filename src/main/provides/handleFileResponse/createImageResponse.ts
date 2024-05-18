import { PetaFile } from "@/commons/datas/petaFile";

import { getStreamFromPetaFile } from "@/main/utils/secureFile";

export function createImageResponse(petaFile: PetaFile, type: "thumbnail" | "original") {
  return new Response(getStreamFromPetaFile(petaFile, type) as any);
}
