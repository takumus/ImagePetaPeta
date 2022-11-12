import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import { initWorkerThreads } from "@/mainProcess/utils/initWorkerThreads";
import { parentPort } from "worker_threads";
type ToWorker = { data: Buffer; outputFilePath: string; size: number; quality: number };
type toMain = Awaited<ReturnType<typeof generateMetadata>>;
export default initWorkerThreads<ToWorker, toMain>(parentPort, (parentPort) => {
  parentPort.on("message", async (params) => {
    const metadata = await generateMetadata(params);
    parentPort.postMessage(metadata);
  });
});
