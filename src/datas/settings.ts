export interface Settings {
  dbDirectory: string,
  lowMemoryMode: boolean,
  darkMode: boolean,
  alwaysOnTop: boolean,
  enableHardwareAcceleration: boolean,
  showFPS: boolean
}
export const defaultSettings: Settings = {
  dbDirectory: "",
  lowMemoryMode: false,
  darkMode: false,
  alwaysOnTop: false,
  enableHardwareAcceleration: true,
  showFPS: false
}