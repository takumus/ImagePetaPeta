import deepcopy from "deepcopy";
import { IpcRendererEvent } from "electron/main";

import { IPC_GLOBAL_NAME } from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const WINDOW = window as any;
export const IPC = {
  send: <U extends keyof IpcFunctions>(
    e: U,
    ...args: Parameters<IpcFunctions[U]>
  ): ReturnType<IpcFunctions[U]> => {
    return WINDOW[IPC_GLOBAL_NAME].send(
      e,
      ...args.map((arg) => (arg === undefined ? undefined : arg === null ? null : deepcopy(arg))),
    );
  },
  on: <U extends keyof IpcEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[U]>) => void,
  ): string => {
    return WINDOW[IPC_GLOBAL_NAME].on(e, cb);
  },
  off: (id: string): void => {
    return WINDOW[IPC_GLOBAL_NAME].off(id);
  },
};
