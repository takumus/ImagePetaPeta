import { IpcRendererEvent } from "electron/main";
import deepcopy from "lodash.clonedeep";

import { IPC_GLOBAL_NAME } from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

const WINDOW = window as any;
type Funcs = IpcFunctions & {
  [C in keyof IpcEvents]: {
    on: <U extends keyof IpcEvents[C]>(
      e: U,
      cb: (event: IpcRendererEvent, ...args: Parameters<FunctionGuard<IpcEvents[C][U]>>) => void,
    ) => { off: () => void };
    once: <U extends keyof IpcEvents[C]>(
      e: U,
      cb: (event: IpcRendererEvent, ...args: Parameters<FunctionGuard<IpcEvents[C][U]>>) => void,
    ) => { off: () => void };
  };
} & {
  electronWebUtils: {
    getPathForFile(file: File): string;
  };
};
const cacheFunctions: { [p1: string]: { [p2: string]: any } } = {};
const cacheProxies: { [p1: string]: any } = {};
export const IPC = new Proxy<Funcs>({} as any, {
  get(_target: Funcs, p1: any, _receiver: any) {
    if (p1 === "electronWebUtils") {
      return WINDOW[IPC_GLOBAL_NAME].electronWebUtils;
    }
    if (cacheProxies[p1] === undefined) {
      cacheFunctions[p1] = {};
      cacheProxies[p1] = new Proxy<any>({} as any, {
        get(_target: any, p2: any, _receiver: any) {
          if (p2 === "on" || p2 === "once") {
            return (key: any, cb: any) => WINDOW[IPC_GLOBAL_NAME][p2](`${p1}.${key}`, cb);
          }
          if (cacheFunctions[p1][p2] === undefined) {
            cacheFunctions[p1][p2] = (...args: any) =>
              WINDOW[IPC_GLOBAL_NAME].send(
                `${p1}.${p2}`,
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
  },
});
