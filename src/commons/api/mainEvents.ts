import { PetaImage } from "@/commons/datas/petaImage";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { WindowType } from "@/commons/datas/windowType";
import { TaskStatus } from "@/commons/api/interfaces/task";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";

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
