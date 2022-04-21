import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { PetaImage } from "@/commons/datas/petaImage";
import { Task } from "./interfaces/task";

export interface MainEvents {
  updatePetaImages: () => void;
  updatePetaImage: (petaImage: PetaImage) => void;
  updatePetaTags: () => void;
  taskStatus: (task: Task) => void;
  notifyUpdate: (current: string, latest: string) => void;
  windowFocused: (focused: boolean) => void;
  regenerateThumbnailsProgress: (done: number, count: number) => void;
  regenerateThumbnailsBegin: () => void;
  regenerateThumbnailsComplete: () => void;
}