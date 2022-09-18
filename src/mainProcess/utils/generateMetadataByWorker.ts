import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import GenerateMetadataWorkerThreads from "@/mainProcess/workers/generateMetadata.worker-threads";
import { Worker } from "worker_threads";

const workers: { idle: boolean; worker: Worker; id: number }[] = [];
for (let i = 0; i < 8; i++) {
  const worker = {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    worker: new (GenerateMetadataWorkerThreads as any)() as Worker,
    idle: true,
    id: i,
  };
  workers.push(worker);
}
export async function generateMetadataByWorker(
  params: Parameters<typeof generateMetadata>[0],
  afterTask: (result: Awaited<ReturnType<typeof generateMetadata>>) => Promise<void>,
) {
  let worker: { idle: boolean; worker: Worker } | undefined = undefined;
  /* eslint-disable-next-line */
  while (true) {
    await new Promise((res) => {
      setTimeout(res);
    });
    worker = workers.find((worker) => worker.idle === true);
    if (worker) {
      worker.idle = false;
      break;
    }
  }
  const result = await new Promise<ReturnType<typeof generateMetadata>>((res, rej) => {
    if (worker === undefined) {
      rej();
      return;
    }
    worker.worker.postMessage(params);
    worker.worker.once("message", async (data) => {
      try {
        await afterTask(data);
        res(data);
      } catch (err) {
        rej(err);
      }
      if (worker === undefined) {
        return;
      }
      worker.idle = true;
    });
  });
  return result;
}
