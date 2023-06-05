import { WindowName } from "@/commons/windows";

export type WindowStates = {
  [key in WindowName]?: {
    width: number;
    height: number;
  };
};
