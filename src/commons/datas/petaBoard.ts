import { v4 as uuid } from "uuid";
import {
  dbPetaPanelToPetaPanel,
  PetaPanel,
  petaPanelToDBPetaPanel,
} from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";
import {
  BOARD_DARK_BACKGROUND_FILL_COLOR,
  BOARD_DARK_BACKGROUND_LINE_COLOR,
  BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
  BOARD_DEFAULT_BACKGROUND_LINE_COLOR,
} from "@/commons/defines";
import deepcopy from "deepcopy";

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
export function createPetaBoard(name: string, index = 0, dark: boolean) {
  const board: PetaBoard = {
    petaPanels: {},
    id: uuid(),
    name: name,
    transform: {
      scale: 1,
      position: new Vec2(0, 0),
    },
    background: {
      fillColor: dark ? BOARD_DARK_BACKGROUND_FILL_COLOR : BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      lineColor: dark ? BOARD_DARK_BACKGROUND_LINE_COLOR : BOARD_DEFAULT_BACKGROUND_LINE_COLOR,
    },
    index: index,
  };
  return board;
}
export function dbPetaBoardsToPetaBoards(
  dbBoards: { [petaBoardId: string]: PetaBoard },
  copy = true,
) {
  const boards = copy ? deepcopy(dbBoards) : dbBoards;
  return Object.values(boards).forEach((board) => {
    board.transform.position = new Vec2(board.transform.position);
    Object.values(board.petaPanels).forEach((pp) => {
      dbPetaPanelToPetaPanel(pp, false);
    });
  });
}
export function petaBoardsToDBPetaBoards(board: PetaBoard, copy = true) {
  const b = copy ? deepcopy(board) : board;
  Object.values(b.petaPanels).forEach((pp) => {
    petaPanelToDBPetaPanel(pp, false);
  });
  return b;
}
