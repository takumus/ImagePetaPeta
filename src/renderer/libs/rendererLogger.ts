import { v4 as uuid } from "uuid";

import { IPC } from "@/renderer/libs/ipc";

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
