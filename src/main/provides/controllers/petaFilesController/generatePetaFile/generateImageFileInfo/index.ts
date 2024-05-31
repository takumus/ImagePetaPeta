import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";

const workerGroup = createWorkerThreadsGroup(
  import(
    "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo/!workerThreads.generateImageFileInfo"
  ),
);
export const generateImageFileInfoByWorker = workerGroup.createUseWorkerThreadFunction((params) => {
  return new Promise((res, rej) => {
    const worker = workerGroup.get();
    worker.use();
    worker.postMessage(params);
    worker.once("error", (err) => {
      rej(err);
      worker.unuse();
    });
    worker.once("message", async (data) => {
      try {
        res(data);
      } catch (err) {
        rej(err);
      }
      worker.unuse();
    });
  });
});
