import { createWriteStream, WriteStream } from "original-fs";
export class Logger {
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
  mainError(...errors: any) {
    this.log(LogFrom.MAIN, "Error:", ...errors);
  }
}
export enum LogFrom {
  MAIN = "MAIN",
  RENDERER = "REND"
}