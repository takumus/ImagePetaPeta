import crypto from "crypto";

export interface PetaFilePetaTag {
  id: string;
  petaFileId: string;
  petaTagId: string;
}

export function createPetaFilePetaTag(petaFileId: string, petaTagId: string): PetaFilePetaTag {
  return {
    id: crypto
      .createHash("sha256")
      .update(petaFileId + petaTagId, "utf-8")
      .digest("hex"),
    petaFileId,
    petaTagId,
  };
}
