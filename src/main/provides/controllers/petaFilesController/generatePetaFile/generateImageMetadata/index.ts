import { WorkerThreadsInputType, WorkerThreadsOutputType } from "@/main/libs/initWorkerThreads";
import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";
import WorkerThreads from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata/generateImageMetadata.!wt";

const wtGroup = createWorkerThreadsGroup(WorkerThreads);
export async function generateImageMetadataByWorker(
  params: WorkerThreadsInputType<typeof WorkerThreads>,
) {
  return new Promise<WorkerThreadsOutputType<typeof WorkerThreads>>((res, rej) => {
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
