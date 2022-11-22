import { v4 as uuid } from "uuid";

import { PetaImage } from "@/commons/datas/petaImage";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";

export interface RPetaPanel extends PetaPanel {
  renderer: {
    selected: boolean;
  };
}
export function createRPetaPanel(
  petaImage: PetaImage,
  position: Vec2,
  width: number,
  height?: number,
) {
  const panel: RPetaPanel = {
    petaImageId: petaImage.id,
    position: position,
    rotation: 0,
    width: width,
    height: height || (petaImage.metadata.height / petaImage.metadata.width) * width,
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
    renderer: {
      selected: false,
    },
  };
  return panel;
}
