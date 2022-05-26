import { PetaImage } from "@/commons/datas/petaImage";
import { Settings } from "../datas/settings";
import { TaskStatus } from "./interfaces/task";

export interface MainEvents {
  updatePetaImages: () => void;
  updatePetaImage: (petaImage: PetaImage) => void;
  updatePetaTags: () => void;
  taskStatus: (id: string, task: TaskStatus) => void;
  notifyUpdate: (latest: string, downloaded: boolean) => void;
  windowFocused: (focused: boolean) => void;
  regenerateMetadatasProgress: (done: number, count: number) => void;
  regenerateMetadatasBegin: () => void;
  regenerateMetadatasComplete: () => void;
  updateSettings: (settings: Settings) => void;
}