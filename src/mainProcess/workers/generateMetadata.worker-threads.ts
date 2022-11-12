import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import { parentPort } from "worker_threads";
// console.log("worker spawned");
parentPort?.on(
  "message",
  async (params: { data: Buffer; outputFilePath: string; size: number; quality: number }) => {
    const metadata = await generateMetadata(params);
    parentPort?.postMessage(metadata);
  },
);
export default {} as WorkerThreadsClass;
