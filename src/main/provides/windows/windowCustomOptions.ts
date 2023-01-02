import { WindowType } from "@/commons/datas/windowType";
import {
  WINDOW_EULA_HEIGHT,
  WINDOW_EULA_WIDTH,
  WINDOW_SETTINGS_HEIGHT,
  WINDOW_SETTINGS_WIDTH,
} from "@/commons/defines";

import { useConfigSettings } from "@/main/provides/configs";

export function getWindowCustomOptions(type: WindowType): Electron.BrowserWindowConstructorOptions {
  const configSettings = useConfigSettings();
  switch (type) {
    case WindowType.BOARD:
      return {
        trafficLightPosition: {
          x: 13,
          y: 13,
        },
        alwaysOnTop: configSettings.data.alwaysOnTop,
        // transparent: true,
      };
    case WindowType.BROWSER:
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case WindowType.SETTINGS:
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
    case WindowType.DETAILS:
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case WindowType.CAPTURE:
      return {
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
    case WindowType.EULA:
      return {
        width: WINDOW_EULA_WIDTH,
        height: WINDOW_EULA_HEIGHT,
        minWidth: WINDOW_EULA_WIDTH,
        minHeight: WINDOW_EULA_HEIGHT,
        alwaysOnTop: configSettings.data.alwaysOnTop,
      };
  }
}
