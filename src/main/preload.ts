import { contextBridge, ipcRenderer, webFrame } from "electron";

import { IPC_GLOBAL_NAME } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";

webFrame.setZoomLevel(1);
contextBridge.exposeInMainWorld(IPC_GLOBAL_NAME, {
  send: (key: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(key, ...args);
  },
  on: (key: string, callback: (...argv: unknown[]) => void) => {
    ipcRenderer.on(key, callback);
    return {
      off: () => {
        ipcRenderer.off(key, callback);
      },
    };
  },
  once: (key: string, callback: (...argv: unknown[]) => void) => {
    ipcRenderer.once(key, callback);
    return {
      off: () => {
        ipcRenderer.off(key, callback);
      },
    };
  },
} as typeof IPC);
