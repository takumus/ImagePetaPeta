import { nativeTheme } from "electron";

import { useConfigSettings } from "@/main/provides/configs";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export function isDarkMode() {
  const configSettings = useConfigSettings();
  if (configSettings.data.autoDarkMode) {
    return nativeTheme.shouldUseDarkColors;
  }
  return configSettings.data.darkMode;
}
export function observeDarkMode() {
  nativeTheme.on("updated", () => {
    const windows = useWindows();
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "darkMode", isDarkMode());
  });
}
