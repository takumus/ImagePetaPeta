import { nativeTheme } from "electron";

import { useConfigSettings } from "@/main/provides/configs";
import { useWindows } from "@/main/provides/utils/windows";

export function isDarkMode() {
  const configSettings = useConfigSettings();
  if (configSettings.data.autoDarkMode) {
    return nativeTheme.shouldUseDarkColors;
  }
  return configSettings.data.darkMode;
}
export function observeDarkMode() {
  const windows = useWindows();
  nativeTheme.on("updated", () => {
    windows.emitMainEvent("darkMode", isDarkMode());
  });
}
