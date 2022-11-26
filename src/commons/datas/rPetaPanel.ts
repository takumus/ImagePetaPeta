import { v4 as uuid } from "uuid";

import { PetaFile } from "@/commons/datas/petaFile";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";

export interface RPetaPanel extends PetaPanel {
  renderer: {
    selected: boolean;
  };
}
export function createRPetaPanel(
  petaFile: PetaFile,
  position: Vec2,
  width: number,
  height?: number,
) {
  const panel: RPetaPanel = {
    petaFileId: petaFile.id,
    position: position,
    rotation: 0,
    width: width,
    height: height || (petaFile.metadata.height / petaFile.metadata.width) * width,
    crop: {
      position: new Vec2(0, 0),
      width: 1,
      height: 1,
    },
    id: uuid(),
    index: 0,
    status: {
      type: "none",
    },
    visible: true,
    locked: false,
    renderer: {
      selected: false,
    },
  };
  return panel;
}
