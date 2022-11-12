import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import GenerateMetadataWorkerThreads from "@/mainProcess/workers/generateMetadata.worker-threads";
import { createWorkerThreadsGroup } from "@/mainProcess/utils/workerThreadsGroup";
const wtGroup = createWorkerThreadsGroup(GenerateMetadataWorkerThreads);
export async function generateMetadataByWorker(params: Parameters<typeof generateMetadata>[0]) {
  return new Promise<Awaited<ReturnType<typeof generateMetadata>>>((res, rej) => {
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
