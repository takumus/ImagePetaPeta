import { Vec2 } from "@/commons/utils/vec2";

export interface PetaPanelPlayableLoop {
  enabled: boolean;
  range: {
    start: number;
    end: number;
  };
}
export type PetaPanelPlayableStatus = {
  paused: boolean;
  time: number;
  speed: number;
  loop: PetaPanelPlayableLoop;
};
export type PetaPanelFilters = {
  grayscale?: {
    mode: "luminance" | "brightness";
    value: number;
  };
  alpha?: {
    value: number;
  };
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
  flipVertical: boolean;
  flipHorizontal: boolean;
  crop: {
    position: Vec2;
    width: number;
    height: number;
  };
  filters: PetaPanelFilters;
  id: string;
  index: number;
  status: PetaPanelStatus;
  visible: boolean;
  locked: boolean;
}
