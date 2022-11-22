import deepcopy from "deepcopy";
import { IpcRendererEvent } from "electron/main";

import { IPC_GLOBAL_NAME } from "@/commons/defines";
import { ToFrontFunctions } from "@/commons/ipc/toFrontFunctions";
import { ToMainFunctions } from "@/commons/ipc/toMainFunctions";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const WINDOW = window as any;
export const IPC = {
  send: <U extends keyof ToMainFunctions>(
    e: U,
    ...args: Parameters<ToMainFunctions[U]>
  ): ReturnType<ToMainFunctions[U]> => {
    return WINDOW[IPC_GLOBAL_NAME].send(
      e,
      ...args.map((arg) => (arg === undefined ? undefined : arg === null ? null : deepcopy(arg))),
    );
  },
  on: <U extends keyof ToFrontFunctions>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<ToFrontFunctions[U]>) => void,
  ): string => {
    return WINDOW[IPC_GLOBAL_NAME].on(e, cb);
  },
  off: (id: string): void => {
    return WINDOW[IPC_GLOBAL_NAME].off(id);
  },
};
