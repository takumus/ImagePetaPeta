import { WorkerThreadsInputType, WorkerThreadsOutputType } from "@/main/libs/initWorkerThreads";
import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";
import { worker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo/generateImageFileInfo.!wt";

const wtGroup = createWorkerThreadsGroup<typeof worker>("generateImageFileInfo.!wt.mjs");
export async function generateImageFileInfoByWorker(params: WorkerThreadsInputType<typeof worker>) {
  return new Promise<WorkerThreadsOutputType<typeof worker>>((res, rej) => {
    const wt = wtGroup.getWT();
    wt.use();
    wt.worker.postMessage(params);
    wt.worker.once("message", async (data) => {
      try {
        res(data);
      } catch (err) {
        rej(err);
      }
      wt.unuse();
    });
  });
}
