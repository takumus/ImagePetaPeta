import { RPetaFile } from "@/commons/datas/rPetaFile";
import { Vec2 } from "@/commons/utils/vec2";

export interface Tile {
  petaFile?: RPetaFile;
  position: Vec2;
  width: number;
  height: number;
  visible: boolean;
  preVisible: boolean;
  group?: string;
  id: string;
}
