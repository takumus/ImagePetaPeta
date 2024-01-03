import { Worker } from "node:worker_threads";
import { resolve } from "path";

import { WorkerThreadsInputType, WorkerThreadsOutputType } from "@/main/libs/initWorkerThreads";
import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";
import WorkerThreads from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata/generateImageMetadata.!wt";
import { getDirname } from "@/main/utils/dirname";

class W extends Worker {
  constructor() {
    super(
      resolve(
        process.env.TEST === "true" ? `./_test/_wt` : getDirname(import.meta.url),
        "generateImageMetadata.!wt.mjs",
      ),
    );
  }
}
const wtGroup = createWorkerThreadsGroup(W as any as typeof WorkerThreads);
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
