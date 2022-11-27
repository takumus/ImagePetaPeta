import { Vec2 } from "@/commons/utils/vec2";

export type PetaPanelStatus =
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
  status: PetaPanelStatus;

  visible: boolean;
  locked: boolean;
}
