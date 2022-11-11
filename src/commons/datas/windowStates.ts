import { WindowType } from "@/commons/datas/windowType";
export type WindowStates = {
  [key in WindowType]?: {
    width: number;
    height: number;
    maximized: boolean;
  };
};
