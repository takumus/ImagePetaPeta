import { nativeTheme } from "electron";

import { useConfigSettings } from "@/main/provides/configs";
import { emitMainEvent } from "@/main/utils/emitMainEvent";
import { EmitMainEventTargetType } from "@/main/provides/utils/windows";

export function isDarkMode() {
  const configSettings = useConfigSettings();
  if (configSettings.data.autoDarkMode) {
    return nativeTheme.shouldUseDarkColors;
  }
  return configSettings.data.darkMode;
}
export function observeDarkMode() {
  nativeTheme.on("updated", () => {
    emitMainEvent({ type: EmitMainEventTargetType.ALL }, "darkMode", isDarkMode());
  });
}
