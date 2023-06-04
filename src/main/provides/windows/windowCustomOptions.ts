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

import { useConfigSettings } from "@/main/provides/configs";

export function getWindowCustomOptions(type: WindowName): Electron.BrowserWindowConstructorOptions {
  const configSettings = useConfigSettings();
  switch (type) {
    case "board":
      return {
        trafficLightPosition: {
          x: 13,
          y: 13,
        },
        // transparent: true,
      };
    case "browser":
      return {
        //
      };
    case "settings":
      return {
        width: WINDOW_SETTINGS_WIDTH,
        height: WINDOW_SETTINGS_HEIGHT,
        minWidth: WINDOW_SETTINGS_WIDTH,
        minHeight: WINDOW_SETTINGS_HEIGHT,
        maximizable: false,
        minimizable: false,
      };
    case "details":
      return {
        //
      };
    case "capture":
      return {
        //
      };
    case "eula":
      return {
        width: WINDOW_EULA_WIDTH,
        height: WINDOW_EULA_HEIGHT,
        minWidth: WINDOW_EULA_WIDTH,
        minHeight: WINDOW_EULA_HEIGHT,
      };
    case "quit":
      return {
        width: WINDOW_QUIT_WIDTH,
        height: WINDOW_QUIT_HEIGHT,
        minWidth: WINDOW_QUIT_WIDTH,
        minHeight: WINDOW_QUIT_HEIGHT,
        resizable: false,
        titleBarStyle: undefined,
        closable: false,
      };
    case "modal":
      return {
        width: WINDOW_MODAL_WIDTH,
        height: WINDOW_MODAL_HEIGHT,
        minWidth: WINDOW_MODAL_WIDTH,
        minHeight: WINDOW_MODAL_HEIGHT,
        titleBarStyle: undefined,
        minimizable: false,
        maximizable: false,
        resizable: false,
      };
    case "web":
      return {
        width: WINDOW_SETTINGS_WIDTH,
        height: WINDOW_SETTINGS_HEIGHT,
        minWidth: WINDOW_SETTINGS_WIDTH,
        minHeight: WINDOW_SETTINGS_HEIGHT,
      };
  }
}
