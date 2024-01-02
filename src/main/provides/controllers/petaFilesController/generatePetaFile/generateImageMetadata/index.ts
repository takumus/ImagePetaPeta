import { Worker } from "node:worker_threads";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import { WorkerThreadsInputType, WorkerThreadsOutputType } from "@/main/libs/initWorkerThreads";
import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";
import WorkerThreads from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata/generateImageMetadata.!wt";

class W extends Worker {
  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    super(
      resolve(
        process.env.TEST === "true" ? `./_test/_wt` : __dirname,
        "generateImageMetadata.!wt.js",
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
