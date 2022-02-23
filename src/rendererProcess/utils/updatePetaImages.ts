import { PetaImage, petaImagesArrayToDBPetaImagesArray } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { API } from "@/rendererProcess/api";

export function updatePetaImages(petaImages: PetaImage[], mode: UpdateMode) {
  return API.send("updatePetaImages", petaImagesArrayToDBPetaImagesArray(petaImages), mode);
}