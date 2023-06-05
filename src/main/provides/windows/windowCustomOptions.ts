import {
  WINDOW_EULA_HEIGHT,
  WINDOW_EULA_WIDTH,
  WINDOW_MODAL_HEIGHT,
  WINDOW_MODAL_WIDTH,
  WINDOW_QUIT_HEIGHT,
  WINDOW_QUIT_WIDTH,
  WINDOW_SETTINGS_HEIGHT,
  WINDOW_SETTINGS_WIDTH,
} from "@/commons/defines";
import { WindowName } from "@/commons/windows";

export const windowCustomOptions: {
  [key in WindowName]: Readonly<Electron.BrowserWindowConstructorOptions>;
} = {
  board: {
    trafficLightPosition: {
      x: 13,
      y: 13,
    },
  },
  browser: {},
  settings: {
    width: WINDOW_SETTINGS_WIDTH,
    height: WINDOW_SETTINGS_HEIGHT,
    minWidth: WINDOW_SETTINGS_WIDTH,
    minHeight: WINDOW_SETTINGS_HEIGHT,
    maximizable: false,
    minimizable: false,
  },
  details: {},
  capture: {},
  eula: {
    width: WINDOW_EULA_WIDTH,
    height: WINDOW_EULA_HEIGHT,
    minWidth: WINDOW_EULA_WIDTH,
    minHeight: WINDOW_EULA_HEIGHT,
  },
  quit: {
    width: WINDOW_QUIT_WIDTH,
    height: WINDOW_QUIT_HEIGHT,
    minWidth: WINDOW_QUIT_WIDTH,
    minHeight: WINDOW_QUIT_HEIGHT,
    resizable: false,
    titleBarStyle: undefined,
    closable: false,
  },
  modal: {
    width: WINDOW_MODAL_WIDTH,
    height: WINDOW_MODAL_HEIGHT,
    minWidth: WINDOW_MODAL_WIDTH,
    minHeight: WINDOW_MODAL_HEIGHT,
    titleBarStyle: undefined,
    minimizable: false,
    maximizable: false,
    resizable: false,
  },
  web: {
    width: WINDOW_SETTINGS_WIDTH,
    height: WINDOW_SETTINGS_HEIGHT,
    minWidth: WINDOW_SETTINGS_WIDTH,
    minHeight: WINDOW_SETTINGS_HEIGHT,
  },
};
