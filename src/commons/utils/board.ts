import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";

export function hasPetaImages(board: PetaBoard, petaImages: PetaImage[]) {
  return petaImages.reduce((need, petaImage) => {
    return need
      ? true
      : board
      ? Object.values(board.petaPanels).find(
          (petaPanel) => petaPanel.petaImageId === petaImage.id,
        ) !== undefined
      : false;
  }, false);
}
