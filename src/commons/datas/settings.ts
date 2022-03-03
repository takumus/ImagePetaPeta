import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";

export const defaultSettings = {
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
  tileSize: 128,
  loadThumbnailsInOriginal: false,
  showNsfwWithoutConfirm: false,
  petaImageDirectory: {
    default: true,
    path: ""
  },
  autoAddTag: true,
}
export type Settings = typeof defaultSettings;