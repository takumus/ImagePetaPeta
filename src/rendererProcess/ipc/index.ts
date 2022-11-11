import { MainFunctions } from "@/commons/ipc/mainFunctions";
import { MainEvents } from "@/commons/ipc/mainEvents";
import { IpcRendererEvent } from "electron/main";
import deepcopy from "deepcopy";
import { IPC_GLOBAL_NAME } from "@/commons/defines";
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const WINDOW = window as any;
export const IPC = {
  send: <U extends keyof MainFunctions>(
    e: U,
    ...args: Parameters<MainFunctions[U]>
  ): ReturnType<MainFunctions[U]> => {
    return WINDOW[IPC_GLOBAL_NAME].send(
      e,
      ...args.map((arg) => (arg === undefined ? undefined : arg === null ? null : deepcopy(arg))),
    );
  },
  on: <U extends keyof MainEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<MainEvents[U]>) => void,
  ): string => {
    return WINDOW[IPC_GLOBAL_NAME].on(e, cb);
  },
  off: (id: string): void => {
    return WINDOW[IPC_GLOBAL_NAME].off(id);
  },
};
