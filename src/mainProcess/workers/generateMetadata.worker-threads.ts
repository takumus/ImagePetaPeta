import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import { initWorkerThreads } from "@/mainProcess/utils/initWorkerThreads";
import { parentPort } from "worker_threads";

export default initWorkerThreads<
  { data: Buffer; outputFilePath: string; size: number; quality: number },
  Awaited<ReturnType<typeof generateMetadata>>
>(parentPort, (parentPort) => {
  parentPort.on("message", async (params) => {
    const metadata = await generateMetadata(params);
    parentPort.postMessage(metadata);
  });
});
