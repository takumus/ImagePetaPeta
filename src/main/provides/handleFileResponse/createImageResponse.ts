import { PetaFile } from "@/commons/datas/petaFile";

import { createPetaFileReadStream } from "@/main/utils/secureFile";

export function createImageResponse(petaFile: PetaFile, type: "thumbnail" | "original") {
  return new Response(createPetaFileReadStream(petaFile, type) as any);
}
