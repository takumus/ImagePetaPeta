import { ImageType } from "@/commons/datas/imageType";
import { PetaFile } from "@/commons/datas/petaFile";
import { PROTOCOLS } from "@/commons/defines";

export function getImageURL(petaFile: PetaFile | undefined, type: ImageType) {
  return `${PROTOCOLS.FILE[type === ImageType.ORIGINAL ? "IMAGE_ORIGINAL" : "IMAGE_THUMBNAIL"]}://${
    type === ImageType.ORIGINAL ? petaFile?.file.original : petaFile?.file.thumbnail
  }`;
}
