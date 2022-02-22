import { Vec2 } from "@/utils/vec2";
import { PetaImage } from "@/datas/petaImage";

export interface BrowserThumbnail {
  petaImage: PetaImage,
  position: Vec2
  width: number,
  height: number,
  visible: boolean
}