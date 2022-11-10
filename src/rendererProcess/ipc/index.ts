/* eslint-disable @typescript-eslint/no-explicit-any */
import { MainFunctions } from "@/commons/api/mainFunctions";
import { MainEvents } from "@/commons/api/mainEvents";
import { IpcRendererEvent } from "electron/main";
import deepcopy from "deepcopy";
import { IPC_GLOBAL_NAME } from "@/commons/defines";
interface IPC {
  send<U extends keyof MainFunctions>(
    event: U,
    ...args: Parameters<MainFunctions[U]>
  ): ReturnType<MainFunctions[U]>;
  on<U extends keyof MainEvents>(
    event: U,
    callback: (event: IpcRendererEvent, ...args: Parameters<MainEvents[U]>) => void,
  ): string;
  off(id: string): void;
}
export const IPC: IPC = {
  send: (e: any, ...args: any[]) => {
    args = args.map((arg) => (arg === undefined ? undefined : arg === null ? null : deepcopy(arg)));
    return (window as any)[IPC_GLOBAL_NAME].send(e, ...args);
  },
  on: (e: any, cb: any) => {
    return (window as any)[IPC_GLOBAL_NAME].on(e, cb);
  },
  off: (id: any) => {
    return (window as any)[IPC_GLOBAL_NAME].off(id);
  },
};
