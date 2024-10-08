import { FileType } from "@/commons/datas/fileType";
import { PetaFile } from "@/commons/datas/petaFile";

import Worker from "@/renderer/components/commons/property/worker/generateGamutMapWorker.!ww";
import { generateGamutMapWorkerOutputData } from "@/renderer/components/commons/property/worker/generateGamutMapWorkerData";
import { createWebWorkerGroup } from "@/renderer/libs/workerGroup";
import { getFileURL } from "@/renderer/utils/fileURL";

const wtGroup = createWebWorkerGroup(Worker);
const image = new Image();
const canvas = new OffscreenCanvas(0, 0);
const context = canvas.getContext("2d");
export function generateGamutMap(
  petaFile: PetaFile,
  resolution: number,
  progress: (data: generateGamutMapWorkerOutputData) => void,
) {
  let cancel = () => {
    //
  };
  let completed = false;
  const wt = wtGroup.getWT();
  wt.use();
  const promise = new Promise<boolean>((res, rej) => {
    image.src = getFileURL(petaFile, "thumbnail");
    image.onload = () => {
      if (completed) {
        return;
      }
      canvas.width = image.width;
      canvas.height = image.height;
      context?.drawImage(image, 0, 0);
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        wt.postMessage({
          pixels: imageData.data,
          resolution,
        });
      } else {
        rej();
      }
    };
    cancel = rej;
    wt.on("error", (e) => {
      wt.terminate();
      rej(e.message);
    });
    wt.on("message", (e) => {
      if (completed) {
        return;
      }
      progress(e);
      if (e[1]) {
        wt.unuse();
        completed = true;
        res(true);
      }
    });
  });
  return {
    promise,
    cancel: () => {
      if (completed) {
        return;
      }
      wt.terminate();
      completed = true;
      cancel();
    },
  };
}
