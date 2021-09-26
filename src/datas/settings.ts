export interface Settings {
  dbDirectory: string,
  lowMemoryMode: boolean
}
export const defaultSettings: Settings = {
  dbDirectory: "",
  lowMemoryMode: false
}