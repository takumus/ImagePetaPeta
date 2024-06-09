import { FileType } from "@/commons/datas/fileType";
import { PetaFile } from "@/commons/datas/petaFile";
import { PROTOCOLS } from "@/commons/defines";

export function getFileURL(petaFile: PetaFile | undefined, type: FileType) {
  return `${PROTOCOLS.FILE[type === "original" ? "IMAGE_ORIGINAL" : "IMAGE_THUMBNAIL"]}://${
    type === "original" ? petaFile?.file.original : petaFile?.file.thumbnail
  }`;
}
