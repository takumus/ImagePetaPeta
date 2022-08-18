import { v4 as uuid } from "uuid";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
export class MainLogger {
  constructor(public logger?: Logger) {
    //
  }
  logChunk(label?: string) {
    const uid = uuid().substring(0, 4);
    const id = label ? `${label}(${uid})` : uid;
    return {
      log: (...args: any[]) => {
        this.logger?.log(LogFrom.MAIN, id, ...args);
      },
      error: (...args: any[]) => {
        this.logger?.log(LogFrom.MAIN, id, "Error:", ...args);
      },
      uid,
    };
  }
}
