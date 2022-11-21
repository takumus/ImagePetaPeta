import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import Worker from "@/renderer/components/browser/property/worker/generateGamutMapWorker.worker";
import { generateGamutMapWorkerOutputData } from "@/renderer/components/browser/property/worker/generateGamutMapWorkerData";
import { getImageURL } from "@/renderer/utils/imageURL";
import { createWebWorkerGroup } from "@/renderer/utils/workerGroup";
const wtGroup = createWebWorkerGroup(Worker);
const image = new Image();
const canvas = new OffscreenCanvas(0, 0);
const context = canvas.getContext("2d");
export function generateGamutMap(
  petaImage: PetaImage,
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
    image.src = getImageURL(petaImage, ImageType.THUMBNAIL);
    image.onload = () => {
      if (completed) {
        return;
      }
      canvas.width = image.width;
      canvas.height = image.height;
      context?.drawImage(image, 0, 0);
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        wt.worker.postMessage({
          pixels: imageData.data,
          resolution,
        });
      } else {
        rej();
      }
    };
    cancel = rej;
    wt.worker.onerror = (e) => {
      wt.terminate();
      rej(e.message);
    };
    wt.worker.onmessage = (e) => {
      if (completed) {
        return;
      }
      progress(e.data);
      if (e.data[1]) {
        wt.unuse();
        completed = true;
        res(true);
      }
    };
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