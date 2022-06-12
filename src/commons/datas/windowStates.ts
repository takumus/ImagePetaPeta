import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/commons/defines";
import { WindowType } from "./windowType";
export type WindowStates = {
  [key in WindowType]: {
    width: number,
    height: number,
    maximized: boolean,
  }
};
export const defaultWindowStates: WindowStates = {
  board: {
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    maximized: false
  },
  browser: {
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    maximized: false
  },
  settings: {
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    maximized: false
  },
  details: {
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    maximized: false
  }
}