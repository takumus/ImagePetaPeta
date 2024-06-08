import { createHash } from "crypto";

import { initWorkerThreads } from "@/main/libs/initWorkerThreads";

export default initWorkerThreads<
  string,
  { type: "progress"; progress: number } | { type: "key"; value: string }
>((port) => {
  port.on("message", async (password) => {
    let hash = password;
    const loop = 1000000;
    for (let i = 0; i < loop; i++) {
      hash = createHash("sha512")
        .update(hash + password + hash)
        .digest("hex");
      if (i % (loop / 100) === 0) {
        port.postMessage({ type: "progress", progress: i / loop });
      }
    }
    port.postMessage({ type: "key", value: hash.substring(0, 32) });
  });
});
