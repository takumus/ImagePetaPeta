import { createWriteStream, WriteStream } from "fs";
import * as Path from "path";
import dateFormat from "dateformat";
import { v4 as uuid } from "uuid";

import { LogChunk } from "@/commons/datas/logChunk";

import { createKey, createUseFunction } from "@/main/libs/di";

const callStack = false;
export class Logger {
  private logFile: WriteStream | undefined;
  private date = "";
  constructor(private path: string) {}
  log(from: LogFrom, id: string, ...args: unknown[]) {
    try {
      this.open();
      const date = `[${from}][${id}](${dateFormat(new Date(), "HH:MM:ss.L")})${callStack ? `[${extractFunctionNames(new Error().stack ?? "")}]` : ""}`;
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
      console.log(`${from === LogFrom.MAIN ? "\x1b[35m" : "\x1b[32m"}${date}\x1b[0m`, ...args);
    } catch (error) {
      console.log("Could not write logfile", error);
    }
  }
  open() {
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
  close() {
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
  logMainChunk(label?: string) {
    return this.logChunk(LogFrom.MAIN, label);
  }
  logRendererChunk(label?: string) {
    return this.logChunk(LogFrom.RENDERER, label);
  }
  logChunk(logFrom: LogFrom, label?: string): LogChunk {
    const uid = uuid().substring(0, 4);
    const id = label ? `${label}(${uid})` : uid;
    return {
      debug: (...args: unknown[]) => {
        this.log(logFrom, id, ...args);
      },
      error: (...args: unknown[]) => {
        this.log(logFrom, id, "Error:", ...args);
      },
      warn: (...args: unknown[]) => {
        this.log(logFrom, id, "Warn:", ...args);
      },
      uid,
    };
  }
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
export enum LogFrom {
  MAIN = "MAIN",
  RENDERER = "RENDERER",
}
export const loggerKey = createKey<Logger>("logger");
export const useLogger = createUseFunction(loggerKey);
