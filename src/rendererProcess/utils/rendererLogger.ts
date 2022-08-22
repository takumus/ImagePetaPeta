import { API } from "@/rendererProcess/api";
import { v4 as uuid } from "uuid";
export function logChunk() {
  const uid = uuid().substring(0, 4);
  return {
    log: (...args: unknown[]) => {
      API.send("log", uid, ...args);
    },
    error: (...args: unknown[]) => {
      API.send("log", uid, "Error:", ...args);
    },
    uid,
  };
}
