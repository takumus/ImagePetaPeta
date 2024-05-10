import { createReadStream } from "fs";

import { PetaFile } from "@/commons/datas/petaFile";

import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { secureFile } from "@/main/utils/secureFile";

export function createImageResponse(petaFile: PetaFile, type: "thumbnail" | "original") {
  const path = getPetaFilePath.fromPetaFile(petaFile)[type];
  return new Response(
    (petaFile.encrypted
      ? secureFile.decrypt.toStream(path, useConfigSecureFilePassword().getValue())
      : createReadStream(path)) as any,
  );
}
