import { createWriteStream, WriteStream } from "fs";
import * as Path from "path";
import dateFormat from "dateformat";
import { v4 as uuid } from "uuid";
export class Logger {
  logFile: WriteStream | undefined;
  date = "";
  constructor(private path: string) {
  }
  log(from: LogFrom, id: string, ...args: any[]) {
    this.open();
    const date = `[${from}][${id}](${new Date().toLocaleString()})`;
    console.log(date, ...args);
    if (this.logFile) {
      this.logFile.write(date + " " + args.map((arg) => JSON.stringify(arg)).join(" ") + "\n");
    }
  }
  task() {
    const id = uuid().substring(0, 4);
    return {
      mainLog: (...args: any[]) => {
        this.log(LogFrom.MAIN, id, ...args);
      },
      mainError: (...errors: any[]) => {
        this.log(LogFrom.MAIN, id, "Error:", ...errors);
      }
    }
  }
  open() {
    const date = dateFormat(new Date(), "yyyy-mm-dd");
    if (this.date != date) {
      this.close();
      this.logFile = createWriteStream(Path.resolve(this.path, date + ".log"), { flags: "a" });
    }
    this.date = date;
  }
  close() {
    if (this.logFile) {
      this.logFile.close();
      this.logFile = undefined;
    }
  }
}
export enum LogFrom {
  MAIN = "MAIN",
  RENDERER = "REND"
}