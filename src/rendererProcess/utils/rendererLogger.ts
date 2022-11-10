import { IPC } from "@/rendererProcess/ipc";
import { v4 as uuid } from "uuid";
export function logChunk() {
  const uid = uuid().substring(0, 4);
  return {
    log: (...args: unknown[]) => {
      IPC.send("log", uid, ...args);
    },
    error: (...args: unknown[]) => {
      IPC.send("log", uid, "Error:", ...args);
    },
    uid,
  };
}
