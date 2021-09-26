export interface Settings {
  dbDirectory: string,
  lowMemoryMode: boolean,
  darkMode: boolean
}
export const defaultSettings: Settings = {
  dbDirectory: "",
  lowMemoryMode: false,
  darkMode: false
}