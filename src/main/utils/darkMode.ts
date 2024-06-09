import { nativeTheme } from "electron";

import { useConfigSettings } from "@/main/provides/configs";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
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
    windows.emitMainEvent({ type: "all" }, "common", "style", getStyle());
  });
}
