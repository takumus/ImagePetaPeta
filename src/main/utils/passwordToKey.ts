import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";

const workerGroup = createWorkerThreadsGroup(import("@/main/utils/!workerThreads.passwordToKey"));
export function passwordToKey(password: string) {
  return new Promise<string>((res) => {
    workerGroup.get().postMessage(password);
    workerGroup.get().on("message", (message) => {
      if (message.type === "key") {
        res(message.value);
      } else {
        console.log(message.progress);
      }
    });
  });
}
