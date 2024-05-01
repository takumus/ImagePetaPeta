import { FileType } from "@/commons/datas/fileType";
import { PetaFile } from "@/commons/datas/petaFile";
import { PROTOCOLS } from "@/commons/defines";

export function getFileURL(petaFile: PetaFile | undefined, type: FileType) {
  const protocol: "stream" | "file" =
    petaFile?.metadata.type === "video" && type === FileType.ORIGINAL ? "file" : "stream";
  return `${PROTOCOLS.FILE[type === FileType.ORIGINAL ? "IMAGE_ORIGINAL" : "IMAGE_THUMBNAIL"] + "-" + protocol}://${
    type === FileType.ORIGINAL ? petaFile?.file.original : petaFile?.file.thumbnail
  }`;
}
