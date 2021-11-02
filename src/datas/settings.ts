export interface Settings {
  dbDirectory: string,
  lowMemoryMode: boolean,
  darkMode: boolean,
  alwaysOnTop: boolean,
  enableHardwareAcceleration: boolean,
  showFPS: boolean,
  zoomSensitivity: number,
  moveSensitivity: number
}
export const defaultSettings: Settings = {
  dbDirectory: "",
  lowMemoryMode: false,
  darkMode: false,
  alwaysOnTop: false,
  enableHardwareAcceleration: true,
  showFPS: false,
  zoomSensitivity: 1,
  moveSensitivity: 1
}
export function upgradeSettings(settings: Settings) {
  // バージョンアップで旧ファイルとの整合性を取る
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = 100;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = 100;
  }
  return settings;
}