import { toVec2, Vec2 } from "@/utils";
import { v4 as uuid } from "uuid";
export type PetaImageId = string;
export interface PetaImage {
  fileName: string,
  name: string,
  fileDate: number,
  addDate: number,
  categories: string[],
  width: number,
  height: number,
  id: PetaImageId,
  _selected: boolean
}
export type PetaImages = {[id: string]: PetaImage};
export interface PetaThumbnail {
  petaImage: PetaImage,
  position: Vec2
  width: number,
  height: number,
  visible: boolean
}
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
  _petaImage?: PetaImage,
  _selected: boolean
}
export interface BoardTransform {
  scale: number,
  position: Vec2
}
export interface Board {
  petaPanels: PetaPanel[],
  id: string,
  name: string,
  transform: BoardTransform,
  index: number
}
export interface Category {
  name: string,
  id: string
}
export type Categories = {[id: string]: Category};
export enum ImportImageResult {
  SUCCESS = "success",
  EXISTS = "exists",
  ERROR = "error"
}
export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2
}
export enum SortMode {
  ADD_DATE = "add_date",
}
export interface ContextMenuItem {
  label?: string,
  click?: () => any,
  id?: string,
  separate?: boolean
}
export enum MenuType {
  board = "board",
  tab = "tab",
  petaPanel = "petaPanel"
}
export enum UpdateMode {
  INSERT = "insert",
  UPDATE = "update",
  REMOVE = "remove"
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
    index: index
  }
  return board;
}
export function createCategory(name: string) {
  const category: Category = {
    id: uuid(),
    name: name
  }
  return category;
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
    _petaImage: petaImage,
    _selected: false
  }
  return panel;
}
export function parseBoards(boards: Board[], petaImages: PetaImages) {
  return boards.forEach((board) => {
    board.transform.position = toVec2(board.transform.position);
    board.petaPanels.forEach(pp => {
      pp._petaImage = petaImages[pp.petaImageId];
      pp.position = toVec2(pp.position);
    })
  });
}
export function toDBBoard(board: Board) {
  const b = JSON.parse(JSON.stringify(board)) as Board;
  b.petaPanels.forEach((pp) => {
    pp._petaImage = undefined;
  });
  return b;
}