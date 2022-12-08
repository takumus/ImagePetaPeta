import { Vec2 } from "@/commons/utils/vec2";

export type PetaPanelPlayableStatus = {
  paused: boolean;
  time: number;
  speed: number;
};
export type PetaPanelStatus =
  | ({
      type: "gif";
    } & PetaPanelPlayableStatus)
  | ({
      type: "video";
      volume: number;
    } & PetaPanelPlayableStatus)
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
