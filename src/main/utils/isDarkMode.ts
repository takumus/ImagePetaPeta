import { configSettingsKey } from "@/main/configs";
import { inject } from "@/main/utils/di";
import { nativeTheme } from "electron";

export function isDarkMode() {
  const configSettings = inject(configSettingsKey);
  if (configSettings.data.autoDarkMode) {
    return nativeTheme.shouldUseDarkColors;
  }
  return configSettings.data.darkMode;
}
