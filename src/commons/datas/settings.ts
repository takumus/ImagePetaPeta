import deepcopy from "deepcopy";
const defaultSettings = {
  lowMemoryMode: false,
  darkMode: false,
  autoDarkMode: true,
  alwaysOnTop: false,
  enableHardwareAcceleration: true,
  showFPS: false,
  zoomSensitivity: 100,
  moveSensitivity: 100,
  autoHideUI: false,
  tileSize: 128,
  loadThumbnailsInOriginal: false,
  showNsfwWithoutConfirm: false,
  petaImageDirectory: {
    default: true,
    path: ""
  },
  autoAddTag: true,
  ignoreMinorUpdate: true,
  visibleLayerPanel: true,
  waifu2x: {
    execFilePath: "",
    parameters: [
      "-i", "$$INPUT$$",
      "-o", "$$OUTPUT$$",
      "-n", "1",
      "--scale_ratio", "2"
    ],
  }
}
export function getDefaultSettings() {
  const settings = deepcopy(defaultSettings);
  if (process.platform == "darwin") {
    settings.moveSensitivity = 75;
    settings.zoomSensitivity = 750;
  }
  return settings;
}
export type Settings = typeof defaultSettings;