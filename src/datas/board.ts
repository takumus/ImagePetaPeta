import { v4 as uuid } from "uuid";
import { PetaPanel } from "./petaPanel";
import { vec2FromObject, Vec2 } from "@/utils/vec2";
import { PetaImages } from "./petaImage";
import { BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/defines";

export interface Board {
  petaPanels: PetaPanel[],
  id: string,
  name: string,
  transform: BoardTransform,
  index: number,
  background: {
    fillColor: string,
    lineColor: string
  }
}
export interface BoardTransform {
  scale: number,
  position: Vec2
}
export function parseBoards(boards: Board[], petaImages: PetaImages) {
  return boards.forEach((board) => {
    board.transform.position = vec2FromObject(board.transform.position);
    board.petaPanels.forEach(pp => {
      pp._petaImage = petaImages[pp.petaImageId];
      pp.position = vec2FromObject(pp.position);
      pp.crop.position = vec2FromObject(pp.crop.position);
    })
  });
}
export function createBoard(name: string, index = 0) {
  const board: Board = {
    petaPanels: [],
    id: uuid(),
    name: name,
    transform: {
      scale: 1,
      position: new Vec2(0, 0)
    },
    background: {
      fillColor: "#ffffff",
      lineColor: "#cccccc"
    },
    index: index
  }
  return board;
}
export function addBoardProperties(board: Board) {
  // バージョンアップで旧ファイルとの整合性を取る
  if (!board.background) {
    board.background = {
      fillColor: BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      lineColor: BOARD_DEFAULT_BACKGROUND_LINE_COLOR
    }
  }
}
export function toDBBoard(board: Board) {
  const b = JSON.parse(JSON.stringify(board)) as Board;
  b.petaPanels.forEach((pp) => {
    pp._petaImage = undefined;
  });
  return b;
}