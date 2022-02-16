import { v4 as uuid } from "uuid";
import { PetaPanel } from "./petaPanel";
import { Vec2 } from "@/utils/vec2";
import { PetaImages } from "./petaImage";
import { BOARD_DARK_BACKGROUND_FILL_COLOR, BOARD_DARK_BACKGROUND_LINE_COLOR, BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/defines";
import deepcopy from "deepcopy";

export interface PetaBoard {
  petaPanels: PetaPanel[],
  id: string,
  name: string,
  transform: PetaBoardTransform,
  index: number,
  background: {
    fillColor: string,
    lineColor: string
  }
}
export interface PetaBoardTransform {
  scale: number,
  position: Vec2
}
export function createPetaBoard(name: string, index = 0, dark: boolean) {
  const board: PetaBoard = {
    petaPanels: [],
    id: uuid(),
    name: name,
    transform: {
      scale: 1,
      position: new Vec2(0, 0)
    },
    background: {
      fillColor: dark ? BOARD_DARK_BACKGROUND_FILL_COLOR : BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      lineColor: dark ? BOARD_DARK_BACKGROUND_LINE_COLOR : BOARD_DEFAULT_BACKGROUND_LINE_COLOR,
    },
    index: index
  }
  return board;
}
export function dbPetaBoardsToPetaBoards(boards: PetaBoard[], petaImages: PetaImages) {
  return boards.forEach((board) => {
    board.transform.position = new Vec2(board.transform.position);
    board.petaPanels.forEach(pp => {
      pp._petaImage = petaImages[pp.petaImageId];
      pp.position = new Vec2(pp.position);
      pp.crop.position = new Vec2(pp.crop.position);
    });
    // board.petaPanels = board.petaPanels.filter((pp) => pp._petaImage);
  });
}
export function petaBoardsToDBPetaBoards(board: PetaBoard) {
  const b = deepcopy(board);
  b.petaPanels.forEach((pp) => {
    pp._petaImage = undefined;
  });
  return b;
}