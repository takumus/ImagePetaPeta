import { v4 as uuid } from "uuid";
import { PetaImage } from "./petaImage";
import { PetaTag } from "./petaTag";
export interface PetaImagePetaTag {
  id: string,
  petaImageId: string,
  petaTagId: string
}

export function createPetaPetaImagePetaTag(petaImageId: string, petaTagId: string): PetaImagePetaTag {
  return {
    id: petaImageId + petaTagId,
    petaImageId,
    petaTagId
  }
}