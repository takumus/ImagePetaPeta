import { Vec2 } from "@/utils/vec2";
import { PetaImage } from "./petaImage";
import { v4 as uuid } from "uuid";

export interface PetaPanel {
  petaImageId: string,
  position: Vec2,
  rotation: number,
  width: number,
  height: number,
  crop: {
    position: Vec2,
    width: number,
    height: number
  },
  id: string,
  index: number,
  _petaImage?: PetaImage
}
export function addPetaPanelProperties(p: PetaPanel) {
  // バージョンアップで旧ファイルとの整合性を取る
}
export function createPetaPanel(petaImage: PetaImage, position: Vec2, width: number, height?: number) {
  const panel: PetaPanel = {
    petaImageId: petaImage.id,
    position: position,
    rotation: 0,
    width: width,
    height: height || petaImage.height * width,
    crop: {
      position: new Vec2(0, 0),
      width: 1,
      height: 1
    },
    id: uuid(),
    index: 0,
    _petaImage: petaImage
  }
  return panel;
}