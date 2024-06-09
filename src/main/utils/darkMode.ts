import { nativeTheme } from "electron";

import { useConfigSettings } from "@/main/provides/configs";
import { useWindows } from "@/main/provides/windows";
import { defaultStyles } from "@/renderer/styles/styles";

export function getStyle() {
  const configSettings = useConfigSettings();
  let darkMode = false;
  if (configSettings.data.autoDarkMode) {
    darkMode = nativeTheme.shouldUseDarkColors;
  } else {
    darkMode = configSettings.data.darkMode;
  }
  return darkMode ? defaultStyles.dark : defaultStyles.light;
}
export function observeDarkMode() {
  nativeTheme.on("updated", () => {
    const windows = useWindows();
    windows.emit.common.style({ type: "all" }, getStyle());
  });
}
