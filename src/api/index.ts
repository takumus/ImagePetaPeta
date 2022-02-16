import { Main } from "@/api/main";
import { Renderer } from "@/api/renderer";
import { IpcRendererEvent } from "electron/main";
import deepcopy from "deepcopy";
export const NAME = "main";
export interface MainAPI {
  send<U extends keyof Main>(event: U, ...args: Parameters<Main[U]>): ReturnType<Main[U]>;
  on<U extends keyof Renderer>(event: U, callback:(event: IpcRendererEvent, ...args: Parameters<Renderer[U]>) => void): string;
  off(id: string): void;
}
export const _API = (window as any)[NAME] as (MainAPI);
export const API = {
  send: (e: any, ...args: any[]) => {
    args = args.map((arg) => arg === undefined ? undefined : arg === null ? null : deepcopy(arg));
    return _API.send(e, ...args);
  },
  on: (e: any, cb: any) => {
    return _API.on(e, cb);
  },
  off: (id: any) => {
    return _API.off(id);
  }
} as MainAPI;
const production = process.env["NODE_ENV"] == "production";
export const log = (...args: any) => {
  if (!production) {
    console.log(...args);
  }
  API.send("log", ...args);
}