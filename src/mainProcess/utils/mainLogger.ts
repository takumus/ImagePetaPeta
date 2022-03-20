import { v4 as uuid } from "uuid";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
export class MainLogger {
  constructor(public logger?: Logger) {
    //
  }
  logChunk() {
    const id = uuid().substring(0, 4);
    return {
      log: (...args: any[]) => {
        this.logger?.log(LogFrom.MAIN, id, ...args);
      },
      error: (...args: any[]) => {
        this.logger?.log(LogFrom.MAIN, id, "Error:", ...args);
      }
    }
  }
}