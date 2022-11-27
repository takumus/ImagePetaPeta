import { Vec2 } from "@/commons/utils/vec2";

export interface PetaPanel {
  petaFileId: string;
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
  status:
    | {
        type: "gif";
        stopped: boolean;
        time: number;
      }
    | {
        type: "video";
        stopped: boolean;
        time: number;
        volume: number;
      }
    | {
        type: "none";
      };

  visible: boolean;
  locked: boolean;
}
