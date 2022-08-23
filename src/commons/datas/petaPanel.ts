import { Vec2 } from "@/commons/utils/vec2";
import { PetaImage } from "@/commons/datas/petaImage";
import { v4 as uuid } from "uuid";
import deepcopy from "deepcopy";

export interface PetaPanel {
  petaImageId: string;
  position: Vec2;
  rotation: number;
  width: number;
  height: number;
  crop: {
    position: Vec2;
    width: number;
    height: number;
  };
  id: string;
  index: number;
  gif: {
    stopped: boolean;
    frame: number;
  };
  visible: boolean;
  locked: boolean;
  _selected?: boolean;
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
      height: 1,
    },
    id: uuid(),
    index: 0,
    gif: {
      stopped: false,
      frame: 0,
    },
    visible: true,
    locked: false,
    _selected: false,
  };
  return panel;
}
export function petaPanelToDBPetaPanel(petaPanel: PetaPanel, copy = true) {
  const dbPetaPanel = copy ? deepcopy(petaPanel) : petaPanel;
  dbPetaPanel._selected = undefined;
  return dbPetaPanel;
}
export function dbPetaPanelToPetaPanel(dbPetaPanel: PetaPanel, copy = true) {
  const petaPanel = copy ? deepcopy(dbPetaPanel) : dbPetaPanel;
  petaPanel._selected = false;
  petaPanel.position = new Vec2(petaPanel.position);
  petaPanel.crop.position = new Vec2(petaPanel.crop.position);
  return petaPanel;
}
