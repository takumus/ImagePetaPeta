import { PetaImage } from "@/commons/datas/petaImage";
import { ImageType } from "@/commons/datas/imageType";
import { PROTOCOLS } from "@/commons/defines";
export function getImageURL(
  petaImage: PetaImage | undefined,
  type: ImageType,
  protocol: "file" | "buffer" = "file",
) {
  return `${
    PROTOCOLS[protocol === "buffer" ? "BUFFER" : "FILE"][
      type === ImageType.ORIGINAL ? "IMAGE_ORIGINAL" : "IMAGE_THUMBNAIL"
    ]
  }://${type === ImageType.ORIGINAL ? petaImage?.file.original : petaImage?.file.thumbnail}`;
}
