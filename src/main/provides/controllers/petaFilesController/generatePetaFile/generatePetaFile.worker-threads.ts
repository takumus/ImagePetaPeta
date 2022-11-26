import { parentPort } from "worker_threads";

import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { generatePetaFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generatePetaFile";

export default initWorkerThreads<
  Parameters<typeof generatePetaFile>[0],
  Awaited<ReturnType<typeof generatePetaFile> | undefined>
>(parentPort, (parentPort) => {
  parentPort.on("message", async (params) => {
    try {
      const petaFile = await generatePetaFile(params);
      parentPort.postMessage(petaFile);
    } catch {
      parentPort.postMessage(undefined);
    }
  });
});
