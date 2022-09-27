import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/commons/defines";
import { WindowType } from "@/commons/datas/windowType";
export type WindowStates = {
  [key in WindowType]?: {
    width: number;
    height: number;
    maximized: boolean;
  };
};
