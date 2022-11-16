import { generateMetadata } from "@/main/utils/generateMetadata";
import { initWorkerThreads } from "@/main/utils/initWorkerThreads";
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
