import { PetaImage } from "@/commons/datas/petaImage";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { WindowType } from "@/commons/datas/windowType";
import { TaskStatus } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";

export interface ToFrontFunctions {
  updatePetaImages: (petaImages: PetaImage[], mode: UpdateMode) => void;
  updatePetaTags: (updates: { petaTagIds: string[]; petaImageIds: string[] }) => void;
  updatePetaTagPartitions: (petaTagPartition: PetaTagPartition[], mode: UpdateMode) => void;
  updatePetaTagCounts: (petaTagCounts: { [petaTagId: string]: number }) => void;
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
