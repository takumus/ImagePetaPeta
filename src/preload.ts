import { contextBridge, ipcRenderer } from "electron";
import { NAME } from "@/api";
import { v4 as uuid } from "uuid";
const listeners: {[key: string]: { key: string, cb: (...argv: any) => void }} = {};
contextBridge.exposeInMainWorld(
  NAME, {
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