import { BrowserWindow } from "electron";

import { WindowName } from "@/commons/windows";

import { useWindows } from "@/main/provides/windows";

export const windowIs = {
  alive(windowLike?: BrowserWindow | WindowName) {
    const window = getWindow(windowLike);
    return window !== undefined && !window.isDestroyed();
  },
  dead(windowLike?: BrowserWindow | WindowName) {
    const window = getWindow(windowLike);
    return window === undefined || window.isDestroyed();
  },
};
function getWindow(windowLike?: BrowserWindow | WindowName) {
  const windows = useWindows().windows;
  if (windowLike instanceof BrowserWindow) {
    return windowLike;
  }
  if (windowLike === undefined) {
    return undefined;
  }
  return windows[windowLike];
}
