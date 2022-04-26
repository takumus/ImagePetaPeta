import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { PetaImage } from "@/commons/datas/petaImage";
import { TaskStatus } from "./interfaces/task";

export interface MainEvents {
  updatePetaImages: () => void;
  updatePetaImage: (petaImage: PetaImage) => void;
  updatePetaTags: () => void;
  taskStatus: (id: string, task: TaskStatus) => void;
  notifyUpdate: (latest: string, downloaded: boolean) => void;
  windowFocused: (focused: boolean) => void;
  regenerateThumbnailsProgress: (done: number, count: number) => void;
  regenerateThumbnailsBegin: () => void;
  regenerateThumbnailsComplete: () => void;
}