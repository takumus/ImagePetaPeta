import { Vec2 } from "@/commons/utils/vec2";
import { PetaImage, PetaImages } from "./petaImage";
import { v4 as uuid } from "uuid";
import deepcopy from "deepcopy";

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
  gif: {
    stopped: boolean,
    frame: number
  }
  visible: boolean,
  locked: boolean,
  _petaImage?: PetaImage
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
    gif: {
      stopped: false,
      frame: 0
    },
    visible: true,
    locked: false,
    _petaImage: petaImage
  }
  return panel;
}
export function petaPanelToDBPetaPanel(petaPanel: PetaPanel, copy = true) {
  const dbPetaPanel = copy ? deepcopy(petaPanel) : petaPanel;
  dbPetaPanel._petaImage = undefined;
  return dbPetaPanel;
}
export function dbPetaPanelToPetaPanel(dbPetaPanel: PetaPanel, petaImages: PetaImages, copy = true) {
  const petaPanel = copy ? deepcopy(dbPetaPanel) : dbPetaPanel;
  petaPanel._petaImage = petaImages[petaPanel.petaImageId];
  petaPanel.position = new Vec2(petaPanel.position);
  petaPanel.crop.position = new Vec2(petaPanel.crop.position);
  return petaPanel;
}