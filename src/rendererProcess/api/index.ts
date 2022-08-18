import { MainFunctions } from "@/commons/api/mainFunctions";
import { MainEvents } from "@/commons/api/mainEvents";
import { IpcRendererEvent } from "electron/main";
import deepcopy from "deepcopy";
import { GLOBAL_API_NAME } from "@/commons/defines";
interface API {
  send<U extends keyof MainFunctions>(event: U, ...args: Parameters<MainFunctions[U]>): ReturnType<MainFunctions[U]>;
  on<U extends keyof MainEvents>(event: U, callback:(event: IpcRendererEvent, ...args: Parameters<MainEvents[U]>) => void): string;
  off(id: string): void;
}
export const API: API = {
  send: (e: any, ...args: any[]) => {
    args = args.map((arg) => arg === undefined ? undefined : arg === null ? null : deepcopy(arg));
    return (window as any)[GLOBAL_API_NAME].send(e, ...args);
  },
  on: (e: any, cb: any) => {
    return (window as any)[GLOBAL_API_NAME].on(e, cb);
  },
  off: (id: any) => {
    return (window as any)[GLOBAL_API_NAME].off(id);
  }
};