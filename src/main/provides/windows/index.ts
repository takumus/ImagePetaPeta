import { BrowserWindow, IpcMainInvokeEvent, app, screen } from "electron";
import * as Path from "path";

import {
  BOARD_DARK_BACKGROUND_FILL_COLOR,
  BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
  EULA,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { Vec2 } from "@/commons/utils/vec2";
import { WindowName } from "@/commons/windows";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useConfigSettings, useConfigWindowStates } from "@/main/provides/configs";
import { useLogger } from "@/main/provides/utils/logger";
import { useQuit } from "@/main/provides/utils/quit";
import { keepAliveWindowNames } from "@/main/provides/windows/keepAliveWindowNames";
import { getWindowCustomOptions } from "@/main/provides/windows/windowCustomOptions";
import { isDarkMode } from "@/main/utils/darkMode";

export class Windows {
  windows: { [key in WindowName]?: BrowserWindow | undefined } = {};
  activeWindows: { [key in WindowName]?: boolean } = {};
  mainWindowName: WindowName | undefined;
  onCloseWindow(type: WindowName) {
    const logger = useLogger();
    const quit = useQuit();
    logger.logMainChunk().log("$Close Window:", type);
    this.saveWindowSize(type);
    this.activeWindows[type] = false;
    const activeMainWindowName = keepAliveWindowNames.reduce<WindowName | undefined>(
      (activeMainWindowName, windowName) =>
        this.activeWindows[windowName] ? windowName : activeMainWindowName,
      undefined,
    );
    if (activeMainWindowName !== undefined) {
      this.changeMainWindow(activeMainWindowName);
    } else if (process.platform !== "darwin") {
      quit.quit();
    }
  }
  showWindows() {
    const configSettings = useConfigSettings();
    if (configSettings.data.eula < EULA) {
      if (this.windows.eula === undefined || this.windows.eula.isDestroyed()) {
        this.openWindow("eula");
      } else {
        this.windows.eula.moveTop();
      }
      return;
    }
    if (configSettings.data.show === "both") {
      this.openWindow("board");
      this.openWindow("browser");
    } else if (configSettings.data.show === "browser") {
      this.openWindow("browser");
    } else {
      this.openWindow("board");
    }
  }
  openWindow(windowName: WindowName, event?: IpcMainInvokeEvent) {
    const logger = useLogger();
    logger.logMainChunk().log("$Open Window:", windowName);
    const position = new Vec2();
    try {
      const parentWindowBounds = event
        ? this.getWindowByEvent(event)?.window.getBounds()
        : undefined;
      if (parentWindowBounds) {
        const display = screen.getDisplayNearestPoint({
          x: parentWindowBounds.x + parentWindowBounds.width / 2,
          y: parentWindowBounds.y + parentWindowBounds.height / 2,
        });
        position.set(display.bounds);
      }
    } catch (error) {
      //
    }
    if (this.windows[windowName] === undefined || this.windows[windowName]?.isDestroyed()) {
      this.windows[windowName] = this.createWindow(windowName, {
        ...getWindowCustomOptions(windowName),
        x: position.x,
        y: position.y,
      });
      this.windows[windowName]?.center();
    } else {
      this.windows[windowName]?.moveTop();
      this.windows[windowName]?.focus();
    }
    return this.windows[windowName] as BrowserWindow;
  }
  createWindow(type: WindowName, options: Electron.BrowserWindowConstructorOptions) {
    const configWindowStates = useConfigWindowStates();
    const logger = useLogger().logMainChunk();
    const window = new BrowserWindow({
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: Path.join(__dirname, "preload.js"),
      },
      backgroundColor: isDarkMode()
        ? BOARD_DARK_BACKGROUND_FILL_COLOR
        : BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      width: configWindowStates.data[type]?.width,
      height: configWindowStates.data[type]?.height,
      ...options,
    });
    this.activeWindows[type] = true;
    const state = configWindowStates.data[type];
    logger.log("$Create Window:", type);
    window.setMenuBarVisibility(false);
    if (state?.maximized) {
      window.maximize();
    }
    window.on("close", () => this.onCloseWindow(type));
    window.addListener("blur", () =>
      this.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "windowFocused", false, type),
    );
    window.addListener("focus", () => {
      this.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "windowFocused", true, type);
      if (keepAliveWindowNames.includes(type)) {
        this.changeMainWindow(type);
      }
      window.moveTop();
    });
    window.webContents.addListener("crashed", () => {
      logger.error("Window Crashed:", type);
      this.reloadWindow(type);
    });
    // const url =
    //   process.env.WEBPACK_DEV_SERVER_URL !== undefined
    //     ? `${process.env.WEBPACK_DEV_SERVER_URL}${type}`
    //     : `app://./${type}.html`;
    // window.loadURL(url);
    if (process.env.VITE_DEV_SERVER_URL) {
      // electron-vite-vue#298
      console.log(process.env.VITE_DEV_SERVER_URL + "htmls/_" + type + ".html");
      window.loadURL(process.env.VITE_DEV_SERVER_URL + "htmls/_" + type + ".html");
      // Open devTool if the app is not packaged
      window.webContents.openDevTools();
    } else {
      window.loadFile(Path.resolve(__dirname, "../renderer/htmls/_" + type + ".html"));
    }
    // window.webContents.openDevTools();
    return window;
  }
  changeMainWindow(type: WindowName) {
    this.mainWindowName = type;
    this.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "mainWindowName", type);
  }
  saveWindowSize(windowName: WindowName) {
    const configWindowStates = useConfigWindowStates();
    const logger = useLogger();
    logger.logMainChunk().log("$Save Window States:", windowName);
    let state = configWindowStates.data[windowName];
    if (state === undefined) {
      state = configWindowStates.data[windowName] = {
        width: WINDOW_DEFAULT_WIDTH,
        height: WINDOW_DEFAULT_HEIGHT,
        maximized: false,
      };
    }
    const window = this.windows[windowName];
    if (window === undefined || window.isDestroyed()) {
      return;
    }
    if (!window.isMaximized()) {
      state.width = window.getSize()[0] || WINDOW_DEFAULT_WIDTH;
      state.height = window.getSize()[1] || WINDOW_DEFAULT_HEIGHT;
    }
    state.maximized = false; //window.isMaximized();
    configWindowStates.save();
  }
  getWindowByEvent(event: IpcMainInvokeEvent) {
    const windowSet = Object.keys(this.windows)
      .map((key) => {
        return {
          type: key as WindowName,
          window: this.windows[key as WindowName],
        };
      })
      .find((windowInfo) => {
        return (
          windowInfo.window &&
          !windowInfo.window.isDestroyed() &&
          windowInfo.window.webContents.mainFrame === event.sender.mainFrame
        );
      });
    if (windowSet && windowSet.window !== undefined) {
      return windowSet as {
        type: WindowName;
        window: BrowserWindow;
      };
    }
    return undefined;
  }
  reloadWindow(type: WindowName) {
    if (!this.windows[type]?.isDestroyed()) {
      this.windows[type]?.reload();
    }
  }
  reloadWindowByEvent(event: IpcMainInvokeEvent) {
    const type = this.getWindowByEvent(event)?.type;
    if (type === undefined) {
      return undefined;
    }
    this.reloadWindow(type);
    return type;
  }
  emitMainEvent<U extends keyof IpcEvents>(
    target: EmitMainEventTarget,
    key: U,
    ...args: Parameters<IpcEvents[U]>
  ): void {
    if (target.type === EmitMainEventTargetType.ALL) {
      Object.values(this.windows).forEach((window) => {
        if (window !== undefined && !window.isDestroyed()) {
          window.webContents.send(key, ...args);
        }
      });
    } else if (target.type === EmitMainEventTargetType.WINDOWS) {
      target.windows.forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send(key, ...args);
        }
      });
    } else if (target.type === EmitMainEventTargetType.WINDOW_NAMES) {
      target.windowNames.forEach((type) => {
        const window = this.windows[type];
        if (window !== undefined && !window.isDestroyed()) {
          window.webContents.send(key, ...args);
        }
      });
    }
  }
}
export enum EmitMainEventTargetType {
  ALL = "all",
  WINDOWS = "windows",
  WINDOW_NAMES = "windowNames",
}
export type EmitMainEventTarget =
  | { type: EmitMainEventTargetType.ALL }
  | { type: EmitMainEventTargetType.WINDOWS; windows: BrowserWindow[] }
  | { type: EmitMainEventTargetType.WINDOW_NAMES; windowNames: WindowName[] };
export const windowsKey = createKey<Windows>("windows");
export const useWindows = createUseFunction(windowsKey);
