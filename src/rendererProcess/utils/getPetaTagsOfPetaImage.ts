import { PetaImage } from "@/commons/datas/petaImage";
import { PetaTag } from "@/commons/datas/petaTag";

export function getPetaTagsOfPetaImage(petaImage: PetaImage, allPetaTags: PetaTag[]) {
  return allPetaTags.filter((petaTag) => {
    return petaTag.petaImages.includes(petaImage.id)
  });
}