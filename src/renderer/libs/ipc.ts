import { IpcRendererEvent } from "electron/main";
import deepcopy from "lodash.clonedeep";

import { IPC_GLOBAL_NAME } from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const WINDOW = window as any;
type Funcs = IpcFunctions & {
  on: <U extends keyof IpcEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[U]>) => void,
  ) => { off: () => void };
  once: <U extends keyof IpcEvents>(
    e: U,
    cb: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[U]>) => void,
  ) => { off: () => void };
};
export const IPC = new Proxy<Funcs>({} as any, {
  get(_target, p: keyof Funcs, _receiver) {
    if (p === "on") {
      return WINDOW[IPC_GLOBAL_NAME].on;
    } else if (p === "once") {
      return WINDOW[IPC_GLOBAL_NAME].once;
    }
    return (...args: any) =>
      WINDOW[IPC_GLOBAL_NAME].send(
        p,
        ...args.map((arg: any) =>
          arg === undefined ? undefined : arg === null ? null : deepcopy(arg),
        ),
      );
  },
});
