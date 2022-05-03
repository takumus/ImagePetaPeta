import { v4 as uuid } from "uuid";
import { PetaImage } from "./petaImage";
import { PetaTag } from "./petaTag";
import crypto from "crypto";
export interface PetaImagePetaTag {
  id: string,
  petaImageId: string,
  petaTagId: string
}

export function createPetaImagePetaTag(petaImageId: string, petaTagId: string): PetaImagePetaTag {
  return {
    id: crypto.createHash("sha256").update(petaImageId + petaTagId, "utf-8").digest("hex"),
    petaImageId,
    petaTagId
  }
}