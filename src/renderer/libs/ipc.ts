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
const cacheFunctions: { [p1: string]: { [p2: string]: any } } = {};
const cacheProxies: { [p1: string]: any } = {};
export const IPC = new Proxy<Funcs>({} as any, {
  get(_target: Funcs, p1: any, _receiver: any) {
    if (p1 === "on") {
      return WINDOW[IPC_GLOBAL_NAME].on;
    } else if (p1 === "once") {
      return WINDOW[IPC_GLOBAL_NAME].once;
    } else {
      if (cacheProxies[p1] === undefined) {
        cacheFunctions[p1] = {};
        cacheProxies[p1] = new Proxy<any>({} as any, {
          get(_target: any, p2: any, _receiver: any) {
            const path = `${p1}.${p2}`;
            console.log(path);
            if (cacheFunctions[p1][p2] === undefined) {
              cacheFunctions[p1][p2] = (...args: any) =>
                WINDOW[IPC_GLOBAL_NAME].send(
                  path,
                  ...args.map((arg: any) =>
                    arg === undefined ? undefined : arg === null ? null : deepcopy(arg),
                  ),
                );
            }
            return cacheFunctions[p1][p2];
          },
        });
      }
      return cacheProxies[p1];
    }
  },
});
