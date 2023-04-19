import {
  WINDOW_EULA_HEIGHT,
  WINDOW_EULA_WIDTH,
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
        alwaysOnTop: configSettings.data.alwaysOnTop,
        // transparent: true,
      };
    case "browser":
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case "settings":
      return {
        width: WINDOW_SETTINGS_WIDTH,
        height: WINDOW_SETTINGS_HEIGHT,
        minWidth: WINDOW_SETTINGS_WIDTH,
        minHeight: WINDOW_SETTINGS_HEIGHT,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case "details":
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case "capture":
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case "eula":
      return {
        width: WINDOW_EULA_WIDTH,
        height: WINDOW_EULA_HEIGHT,
        minWidth: WINDOW_EULA_WIDTH,
        minHeight: WINDOW_EULA_HEIGHT,
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
  }
}
