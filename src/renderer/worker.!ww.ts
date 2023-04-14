import { initWebWorker } from "@/renderer/initWebWorker";

export default initWebWorker<{ msg: string }, { msg: string }>(self, (worker) => {
  worker.addEventListener("message", (e) => {
    worker.postMessage({ msg: e.data.msg.split("").reverse().join("") });
  });
});
