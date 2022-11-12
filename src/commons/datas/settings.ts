import deepcopy from "deepcopy";
const defaultSettings = {
  darkMode: true,
  autoDarkMode: false,
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
  show: "board" as "board" | "browser" | "both",
  eula: 0,
  developerMode: false,
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
