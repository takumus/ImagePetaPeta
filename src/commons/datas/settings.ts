import deepcopy from "lodash.clonedeep";

const defaultSettings = {
  darkMode: true,
  autoDarkMode: false,
  showFPS: false,
  zoomSensitivity: 100,
  moveSensitivity: 100,
  loadTilesInOriginal: true,
  showTagsOnTile: true,
  alwaysShowNSFW: false,
  petaFileDirectory: {
    default: true,
    path: "",
  },
  show: "board" as "board" | "browser" | "both",
  eula: 0,
  web: false,
  disableAcceleratedVideoDecode: false,
  gamutMapSampling: 5000,
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
