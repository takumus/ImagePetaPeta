import { contextBridge, ipcRenderer, webFrame } from "electron";
import { v4 as uuid } from "uuid";
import { GLOBAL_API_NAME } from "@/commons/defines";
const listeners: {[key: string]: { key: string, cb: (...argv: any) => void }} = {};
webFrame.setZoomLevel(1);
contextBridge.exposeInMainWorld(
  GLOBAL_API_NAME, {
    send: (key: string, ...args: any) => {
      return ipcRenderer.invoke(key, ...args);
    },
    on: (key: string, callback: (...argv: any) => void) => {
      const listenerId = uuid();
      const cb = (event: any, ...argv: any[]) => {
        return callback(event, ...argv);
      }
      listeners[listenerId] = {
        key,
        cb
      };
      ipcRenderer.on(key, cb);
      return listenerId;
    },
    off: (id: string) => {
      const listener = listeners[id];
      if (!listener) return;
      ipcRenderer.off(listener.key, listener.cb);
    }
  }
);