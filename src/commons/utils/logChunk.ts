import { v4 as uuid } from "uuid";

import { LogChunk } from "@/commons/datas/logChunk";

export function createLogChunkFunction(
  logFunction: (from: "MAIN" | "REND", id: string, ...args: unknown[]) => void,
) {
  return (logFrom: "MAIN" | "REND", label: string): LogChunk => {
    const uid = uuid().substring(0, 4);
    const id = `${uid}.${label}`;
    return {
      debug: (...args: unknown[]) => {
        logFunction(logFrom, id, ...args);
      },
      error: (...args: unknown[]) => {
        logFunction(logFrom, id, "Error:", ...args);
      },
      warn: (...args: unknown[]) => {
        logFunction(logFrom, id, "Warn:", ...args);
      },
      uid,
    };
  };
}
