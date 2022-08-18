import deepcopy from "deepcopy";
const defaultSettings = {
  darkMode: false,
  autoDarkMode: true,
  alwaysOnTop: false,
  showFPS: false,
  zoomSensitivity: 100,
  moveSensitivity: 100,
  autoHideUI: false,
  loadTilesInOriginal: true,
  showTagsOnTile: true,
  alwaysShowNSFW: false,
  petaImageDirectory: {
    default: true,
    path: "",
  },
  ignoreMinorUpdate: true,
  waifu2x: {
    execFilePath: "",
    parameters: ["-i", "$$INPUT$$", "-o", "$$OUTPUT$$", "-n", "1", "--scale_ratio", "2"],
  },
  show: "board" as "board" | "browser" | "both",
};
export function getDefaultSettings() {
  const settings = deepcopy(defaultSettings);
  if (process.platform === "darwin") {
    settings.moveSensitivity = 75;
    settings.zoomSensitivity = 750;
  }
  return settings;
}
export type Settings = typeof defaultSettings;
