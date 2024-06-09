import { createWriteStream, WriteStream } from "node:fs";
import * as Path from "node:path";
import dateFormat from "dateformat";

import { createLogChunkFunction } from "@/commons/utils/logChunk";

import { createKey, createUseFunction } from "@/main/libs/di";

const callStack = false;
export class Logger {
  private logFile: WriteStream | undefined;
  private date = "";
  constructor(private path: string) {}
  log(from: "MAIN" | "REND", id: string, ...args: unknown[]) {
    try {
      this.open();
      const date = `[${from}](${dateFormat(new Date(), "HH:MM:ss.L")})[${id}]${callStack ? `[${extractFunctionNames(new Error().stack ?? "")}]` : ""}`;
      if (this.logFile) {
        this.logFile.write(
          date + " " + args.map((arg) => JSON.stringify(arg)).join(" ") + "\n",
          (error) => {
            if (error) {
              console.log("Could not write logfile", error);
            }
          },
        );
      }
      console.log(`${from === "MAIN" ? "\x1b[35m" : "\x1b[32m"}${date}\x1b[0m`, ...args);
    } catch (error) {
      console.log("Could not write logfile", error);
    }
  }
  private open() {
    try {
      const date = dateFormat(new Date(), "yyyy-mm-dd");
      if (this.date !== date) {
        this.close();
        this.logFile = createWriteStream(Path.resolve(this.path, date + ".log"), { flags: "a" });
        this.logFile.on("error", (error) => {
          console.log("Could not open logfile", error);
        });
      }
      this.date = date;
    } catch (error) {
      console.log("Could not open logfile", error);
    }
  }
  private close() {
    try {
      if (this.logFile) {
        this.logFile.close();
      }
    } catch (error) {
      console.log("Could not close logfile", error);
    }
    this.logFile = undefined;
  }
  getCurrentLogfilePath() {
    return this.logFile?.path.toString();
  }
  logChunk(label: string) {
    return this._logChunk("MAIN", label);
  }
  private _logChunk = createLogChunkFunction(this.log.bind(this));
}
function extractFunctionNames(errorStack: string): string[] {
  const functionNames: string[] = [];
  const regex = /at\s+(\S+)\s+\(/g;
  let match;
  while ((match = regex.exec(errorStack)) !== null) {
    functionNames.push(match[1]);
  }
  return functionNames.slice(2).reverse();
}
export const loggerKey = createKey<Logger>("logger");
export const useLogger = createUseFunction(loggerKey);
