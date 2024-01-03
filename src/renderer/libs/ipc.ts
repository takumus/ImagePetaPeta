import deepcopy from "deepcopy";
import { IpcRendererEvent } from "electron/main";

import { IPC_GLOBAL_NAME } from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const WINDOW = window as any;
export const IPC = {
  main: new Proxy<IpcFunctions>({} as any, {
    get(_target, p, _receiver) {
      return (...args: any) =>
        WINDOW[IPC_GLOBAL_NAME].send(
          p,
          ...args.map((arg: any) =>
            arg === undefined ? undefined : arg === null ? null : deepcopy(arg),
          ),
        );
    },
  }),
  on: <U extends keyof IpcEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[U]>) => void,
  ): { off: () => void } => {
    return WINDOW[IPC_GLOBAL_NAME].on(e, cb);
  },
  once: <U extends keyof IpcEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[U]>) => void,
  ): { off: () => void } => {
    return WINDOW[IPC_GLOBAL_NAME].once(e, cb);
  },
};
