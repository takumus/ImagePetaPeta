import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/defines";

export interface Settings {
  dbDirectory: string,
  lowMemoryMode: boolean,
  darkMode: boolean,
  autoDarkMode: boolean,
  alwaysOnTop: boolean,
  enableHardwareAcceleration: boolean,
  showFPS: boolean,
  zoomSensitivity: number,
  moveSensitivity: number,
  autoHideUI: boolean,
  windowSize: { width: number, height: number }
  thumbnails: {
    size: number,
    quality: number
  }
}
export const defaultSettings: Settings = {
  dbDirectory: "",
  lowMemoryMode: false,
  darkMode: false,
  autoDarkMode: true,
  alwaysOnTop: false,
  enableHardwareAcceleration: true,
  showFPS: false,
  zoomSensitivity: 100,
  moveSensitivity: 100,
  autoHideUI: false,
  windowSize: { width: WINDOW_DEFAULT_WIDTH, height: WINDOW_DEFAULT_HEIGHT },
  thumbnails: {
    size: BROWSER_THUMBNAIL_SIZE[1],
    quality: BROWSER_THUMBNAIL_QUALITY[1]
  }
}
export function upgradeSettings(settings: Settings) {
  // バージョンアップで旧ファイルとの整合性を取る
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = defaultSettings.zoomSensitivity;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = defaultSettings.moveSensitivity;
  }
  if (settings.windowSize === undefined) {
    settings.windowSize = {
      width: defaultSettings.windowSize.width,
      height: defaultSettings.windowSize.height
    }
  }
  if (settings.thumbnails === undefined) {
    settings.thumbnails = {
      size: defaultSettings.thumbnails.size,
      quality: defaultSettings.thumbnails.quality
    }
  }
  return settings;
}