import GenerateMetadataWorkerThreads from "@/main/utils/generateMetadata/generateMetadata.worker-threads";
import { createWorkerThreadsGroup } from "@/main/utils/workerThreadsGroup";

const wtGroup = createWorkerThreadsGroup(GenerateMetadataWorkerThreads);
export async function generateMetadataByWorker(params: any) {
  return new Promise<any>((res, rej) => {
    const wt = wtGroup.getWT();
    wt.use();
    wt.worker.postMessage(params);
    wt.worker.once("message", async (data) => {
      try {
        // await afterTask(data);
        res(data);
      } catch (err) {
        rej(err);
      }
      wt.unuse();
    });
  });
}
