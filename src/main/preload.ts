import { contextBridge, ipcRenderer, webFrame } from "electron";
import { IPC_GLOBAL_NAME } from "@/commons/defines";
const listeners: { [key: string]: { key: string; cb: (...argv: unknown[]) => void } } = {};
webFrame.setZoomLevel(1);
let listenerId = 0;
contextBridge.exposeInMainWorld(IPC_GLOBAL_NAME, {
  send: (key: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(key, ...args);
  },
  on: (key: string, callback: (...argv: unknown[]) => void) => {
    const cb = (event: unknown, ...argv: unknown[]) => {
      return callback(event, ...argv);
    };
    listeners[listenerId] = {
      key,
      cb,
    };
    ipcRenderer.on(key, cb);
    return listenerId++;
  },
  off: (id: string) => {
    const listener = listeners[id];
    if (!listener) return;
    ipcRenderer.off(listener.key, listener.cb);
  },
});
