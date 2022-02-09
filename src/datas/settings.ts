import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/defines";

export const defaultSettings = {
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
  thumbnails: {
    size: BROWSER_THUMBNAIL_SIZE[0],
    quality: BROWSER_THUMBNAIL_QUALITY[1]
  },
  browserThumbnailSize: 128,
  loadThumbnailsInFullsized: false
}
export function upgradeSettings(settings: Settings) {
  // バージョンアップで旧ファイルとの整合性を取る
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = defaultSettings.zoomSensitivity;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = defaultSettings.moveSensitivity;
  }
  if (settings.thumbnails === undefined) {
    settings.thumbnails = {
      size: defaultSettings.thumbnails.size,
      quality: defaultSettings.thumbnails.quality
    }
  }
  if (settings.browserThumbnailSize === undefined) {
    settings.browserThumbnailSize = defaultSettings.browserThumbnailSize;
  }
  if (settings.loadThumbnailsInFullsized === undefined) {
    settings.loadThumbnailsInFullsized = false;
  }
  return settings;
}
export type Settings = typeof defaultSettings;