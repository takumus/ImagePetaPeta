import { API } from "../api";
import { v4 as uuid } from "uuid";
export function logChunk() {
  const id = uuid().substring(0, 4);
  return {
    log: (...args: any[]) => {
      API.send("log", id, ...args);
    }
  }
}