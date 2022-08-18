import { PetaImage } from "@/commons/datas/petaImage";
import { RemoteBinaryInfo } from "../datas/remoteBinaryInfo";
import { Settings } from "../datas/settings";
import { States } from "../datas/states";
import { WindowType } from "../datas/windowType";
import { TaskStatus } from "./interfaces/task";
import { UpdateMode } from "./interfaces/updateMode";

export interface MainEvents {
  updatePetaImages: (petaImages: PetaImage[], mode: UpdateMode) => void;
  updatePetaTags: () => void;
  taskStatus: (id: string, task: TaskStatus) => void;
  foundLatestVersion: (remote: RemoteBinaryInfo) => void;
  windowFocused: (focused: boolean, windowType: WindowType) => void;
  mainWindowType: (type: WindowType | undefined) => void;
  regenerateMetadatasProgress: (done: number, count: number) => void;
  regenerateMetadatasBegin: () => void;
  regenerateMetadatasComplete: () => void;
  updateSettings: (settings: Settings) => void;
  updateStates: (states: States) => void;
  showNSFW: (value: boolean) => void;
  detailsPetaImage: (petaImage: PetaImage) => void;
  darkMode: (value: boolean) => void;
  dataInitialized: () => void;
}
