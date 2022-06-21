import { API } from "../api";
import { v4 as uuid } from "uuid";
export function logChunk() {
  const uid = uuid().substring(0, 4);
  return {
    log: (...args: any[]) => {
      API.send("log", uid, ...args);
    },
    error: (...args: any[]) => {
      API.send("log", uid, "Error:", ...args);
    },
    uid
  }
}