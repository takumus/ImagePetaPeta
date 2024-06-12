import { v4 as uuid } from "uuid";

import { PetaFile } from "@/commons/datas/petaFile";
import { PetaPanel, PetaPanelStatus } from "@/commons/datas/petaPanel";
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
  const status = ((): PetaPanelStatus => {
    if (petaFile.metadata.type === "image" && petaFile.metadata.gif) {
      return {
        type: "gif",
        paused: true,
        time: 0,
        speed: 1,
        loop: { enabled: true, range: { start: 0, end: 0 } },
      };
    }
    if (petaFile.metadata.type === "video") {
      return {
        type: "video",
        paused: true,
        time: 0,
        speed: 1,
        volume: 0,
        loop: { enabled: true, range: { start: 0, end: 0 } },
      };
    }
    return { type: "none" };
  })();
  const panel: RPetaPanel = {
    petaFileId: petaFile.id,
    position: position,
    rotation: 0,
    width: width,
    height: height || (petaFile.metadata.height / petaFile.metadata.width) * width,
    flipVertical: false,
    flipHorizontal: false,
    crop: {
      position: new Vec2(0, 0),
      width: 1,
      height: 1,
    },
    id: uuid(),
    index: 0,
    status,
    filters: {},
    visible: true,
    locked: false,
    renderer: {
      selected: false,
    },
  };
  return panel;
}
