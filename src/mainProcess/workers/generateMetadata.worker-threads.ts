import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import { parentPort as _parentPort } from "worker_threads";
type WorkerThreadsType = WorkerThreadsTypeFrom<
  { data: Buffer; outputFilePath: string; size: number; quality: number },
  Awaited<ReturnType<typeof generateMetadata>>
>;
const parentPort = _parentPort as WorkerThreadsType["InWorker"];
parentPort.on("message", async (params) => {
  const metadata = await generateMetadata(params);
  parentPort.postMessage(metadata);
});
export default {} as WorkerThreadsType["InMain"];
