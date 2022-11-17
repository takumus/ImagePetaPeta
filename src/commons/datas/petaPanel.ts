import { Vec2 } from "@/commons/utils/vec2";

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
}
