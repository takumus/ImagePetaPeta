import { generateMetadata } from "@/main/utils/generateMetadata";
import GenerateMetadataWorkerThreads from "@/main/workers/generateMetadata.worker-threads";
import { createWorkerThreadsGroup } from "@/main/utils/workerThreadsGroup";
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
