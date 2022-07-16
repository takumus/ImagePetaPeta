export interface RemoteBinaryInfo {
  isLatest: boolean
  version: string,
  sha256: {
    win: string,
    mac: string,
  }
}