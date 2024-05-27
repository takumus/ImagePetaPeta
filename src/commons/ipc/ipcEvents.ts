import { DownloadSelectorData } from "@/commons/datas/downloadSelectorData";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { TaskStatus } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowName } from "@/commons/windows";

import { Style } from "@/renderer/styles/styles";

export interface IpcEvents {
  updatePetaFiles: (petaFiles: PetaFile[], mode: UpdateMode) => void;
  updatePetaTags: (updates: { petaTagIds: string[]; petaFileIds: string[] }) => void;
  updatePetaTagPartitions: (petaTagPartition: PetaTagPartition[], mode: UpdateMode) => void;
  taskStatus: (id: string, task: TaskStatus) => void;
  foundLatestVersion: (remote: RemoteBinaryInfo) => void;
  windowFocused: (focused: boolean, windowName: WindowName) => void;
  mainWindowName: (type: WindowName | undefined) => void;
  regeneratePetaFilesProgress: (done: number, count: number) => void;
  regeneratePetaFilesBegin: () => void;
  regeneratePetaFilesComplete: () => void;
  updateSettings: (settings: Settings) => void;
  updateStates: (states: States) => void;
  showNSFW: (value: boolean) => void;
  detailsPetaFile: (petaFile: PetaFile) => void;
  style: (value: Style) => void;
  dataInitialized: () => void;
  initializationProgress: (log: string) => void;
  openInBrowser: (petaFileID: string) => void;
  updateModalDatas: () => void;
  updateDownloadSelectorURLs: (urls: DownloadSelectorData[]) => void;
}
