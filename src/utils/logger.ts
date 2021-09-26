import { LogFrom } from "@/datas/logFrom";
import { createWriteStream, WriteStream } from "original-fs";
export default class Logger {
  logFile: WriteStream;
  constructor(path: string) {
    this.logFile = createWriteStream(path, { flags: "a" });
  }
  log(from: LogFrom, ...args: any[]) {
    const date = `[${from}](${new Date().toLocaleString()})`;
    console.log(date, ...args);
    this.logFile.write(date + " " + args.map((arg) => JSON.stringify(arg)).join(" ") + "\n");
  }
  mainLog(...args: any[]) {
    this.log(LogFrom.MAIN, ...args);
  }
}