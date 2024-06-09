import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useWindows } from "@/main/provides/windows";

export const windowsIPCFunctions: IpcFunctionsType["windows"] = {
  async getIsFocused(event, log) {
    const windows = useWindows();
    const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
    log.debug("return:", isFocued);
    return isFocued;
  },
  async minimize(event, log) {
    const windows = useWindows();
    const windowInfo = windows.getWindowByEvent(event);
    windowInfo?.window.minimize();
    log.debug(windowInfo?.type);
  },
  async maximize(event, log) {
    const windows = useWindows();
    const windowInfo = windows.getWindowByEvent(event);
    if (windowInfo?.window.isMaximized()) {
      windowInfo?.window.unmaximize();
      return;
    }
    windowInfo?.window.maximize();
    log.debug(windowInfo?.type);
  },
  async close(event, log) {
    const windows = useWindows();
    const windowInfo = windows.getWindowByEvent(event);
    windowInfo?.window.close();
    log.debug(windowInfo?.type);
  },
  async activate(event, log) {
    const windows = useWindows();
    const windowInfo = windows.getWindowByEvent(event);
    windowInfo?.window.moveTop();
    windowInfo?.window.focus();
    log.debug(windowInfo?.type);
  },
  async toggleDevTools(event, log) {
    const windows = useWindows();
    const windowInfo = windows.getWindowByEvent(event);
    windowInfo?.window.webContents.toggleDevTools();
    log.debug(windowInfo?.type);
  },
  async open(event, log, windowName) {
    const windows = useWindows();
    openInBrowserTargetID = undefined;
    log.debug("type:", windowName);
    windows.openWindow(windowName, event);
  },
  async reload(event, log) {
    const windows = useWindows();
    const type = windows.reloadWindowByEvent(event);
    log.debug("type:", type);
  },
  async getMainWindowName(_, log) {
    const windows = useWindows();
    log.debug(windows.mainWindowName);
    return windows.mainWindowName;
  },
};
let openInBrowserTargetID: string | undefined;
