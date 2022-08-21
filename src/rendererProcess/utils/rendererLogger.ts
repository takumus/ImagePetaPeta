import { API } from "@/rendererProcess/api";
import { v4 as uuid } from "uuid";
export function logChunk() {
  const uid = uuid().substring(0, 4);
  return {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    log: (...args: any[]) => {
      API.send("log", uid, ...args);
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    error: (...args: any[]) => {
      API.send("log", uid, "Error:", ...args);
    },
    uid,
  };
}
