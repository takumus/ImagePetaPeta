import { v4 as uuid } from "uuid";

import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";

import { defaultStyles } from "@/renderer/styles/styles";

export interface PetaBoard {
  petaPanels: { [petaPanelId: string]: PetaPanel };
  id: string;
  name: string;
  transform: PetaBoardTransform;
  index: number;
  background: {
    fillColor: string;
    lineColor: string;
  };
}
export interface PetaBoardTransform {
  scale: number;
  position: Vec2;
}
export function createPetaBoard(name: string, index = 0, fillColor: string, lineColor: string) {
  const board: PetaBoard = {
    petaPanels: {},
    id: uuid(),
    name: name,
    transform: {
      scale: 1,
      position: new Vec2(0, 0),
    },
    background: {
      fillColor, //dark ? defaultStyles.dark["--color-0"] : defaultStyles.light["--color-0"],
      lineColor, //defaultStyles.dark["--color-2"] : defaultStyles.light["--color-2"],
    },
    index: index,
  };
  return board;
}
