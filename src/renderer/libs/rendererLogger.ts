import { v4 as uuid } from "uuid";

import { LogChunk } from "@/commons/datas/logChunk";

import { IPC } from "@/renderer/libs/ipc";

export function logChunk(): LogChunk {
  const uid = uuid().substring(0, 4);
  return {
    debug: (...args: unknown[]) => {
      IPC.common.log(uid, ...args);
    },
    error: (...args: unknown[]) => {
      IPC.common.log(uid, "Error:", ...args);
    },
    warn: (...args: unknown[]) => {
      IPC.common.log(uid, "Warn:", ...args);
    },
    uid,
  };
}
