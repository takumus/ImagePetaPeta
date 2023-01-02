import { BrowserWindow, IpcMainInvokeEvent, app, screen } from "electron";
import * as Path from "path";

import { WindowType } from "@/commons/datas/windowType";
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

import { createKey, createUseFunction } from "@/main/libs/di";
import { useConfigSettings, useConfigWindowStates } from "@/main/provides/configs";
import { useLogger } from "@/main/provides/utils/logger";
import { keepAliveWindowTypes } from "@/main/provides/windows/keepAliveWindowTypes";
import { getWindowCustomOptions } from "@/main/provides/windows/windowCustomOptions";
import { isDarkMode } from "@/main/utils/darkMode";

export class Windows {
  windows: { [key in WindowType]?: BrowserWindow | undefined } = {};
  activeWindows: { [key in WindowType]?: boolean } = {};
  mainWindowType: WindowType | undefined;
  onCloseWindow(type: WindowType) {
    const logger = useLogger();
    logger.logMainChunk().log("$Close Window:", type);
    this.saveWindowSize(type);
    this.activeWindows[type] = false;
    const activeMainWindowType = keepAliveWindowTypes.reduce<WindowType | undefined>(
      (activeMainWindowType, windowType) =>
        this.activeWindows[windowType] ? windowType : activeMainWindowType,
      undefined,
    );
    if (activeMainWindowType !== undefined) {
      this.changeMainWindow(activeMainWindowType);
    } else if (process.platform !== "darwin") {
      app.quit();
    }
  }
  showWindows() {
    const configSettings = useConfigSettings();
    if (configSettings.data.eula < EULA) {
      if (this.windows.eula === undefined || this.windows.eula.isDestroyed()) {
        this.openWindow(WindowType.EULA);
      } else {
        this.windows.eula.moveTop();
      }
      return;
    }
    if (configSettings.data.show === "both") {
      this.openWindow(WindowType.BOARD);
      this.openWindow(WindowType.BROWSER);
    } else if (configSettings.data.show === "browser") {
      this.openWindow(WindowType.BROWSER);
    } else {
      this.openWindow(WindowType.BOARD);
    }
  }
  openWindow(windowType: WindowType, event?: IpcMainInvokeEvent) {
    const logger = useLogger();
    logger.logMainChunk().log("$Open Window:", windowType);
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
    if (this.windows[windowType] === undefined || this.windows[windowType]?.isDestroyed()) {
      this.windows[windowType] = this.createWindow(windowType, {
        ...getWindowCustomOptions(windowType),
        x: position.x,
        y: position.y,
      });
      this.windows[windowType]?.center();
    } else {
      this.windows[windowType]?.moveTop();
      this.windows[windowType]?.focus();
    }
    return this.windows[windowType] as BrowserWindow;
  }
  createWindow(type: WindowType, options: Electron.BrowserWindowConstructorOptions) {
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
      if (keepAliveWindowTypes.includes(type)) {
        this.changeMainWindow(type);
      }
      window.moveTop();
    });
    window.webContents.addListener("crashed", () => {
      logger.error("Window Crashed:", type);
      this.reloadWindow(type);
    });
    const url =
      process.env.WEBPACK_DEV_SERVER_URL !== undefined
        ? `${process.env.WEBPACK_DEV_SERVER_URL}${type}`
        : `app://./${type}.html`;
    window.loadURL(url);
    // window.webContents.openDevTools();
    return window;
  }
  changeMainWindow(type: WindowType) {
    this.mainWindowType = type;
    this.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "mainWindowType", type);
  }
  saveWindowSize(windowType: WindowType) {
    const configWindowStates = useConfigWindowStates();
    const logger = useLogger();
    logger.logMainChunk().log("$Save Window States:", windowType);
    let state = configWindowStates.data[windowType];
    if (state === undefined) {
      state = configWindowStates.data[windowType] = {
        width: WINDOW_DEFAULT_WIDTH,
        height: WINDOW_DEFAULT_HEIGHT,
        maximized: false,
      };
    }
    const window = this.windows[windowType];
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
          type: key as WindowType,
          window: this.windows[key as WindowType],
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
        type: WindowType;
        window: BrowserWindow;
      };
    }
    return undefined;
  }
  reloadWindow(type: WindowType) {
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
    } else if (target.type === EmitMainEventTargetType.WINDOW_TYPES) {
      target.windowTypes.forEach((type) => {
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
  WINDOW_TYPES = "windowTypes",
}
export type EmitMainEventTarget =
  | { type: EmitMainEventTargetType.ALL }
  | { type: EmitMainEventTargetType.WINDOWS; windows: BrowserWindow[] }
  | { type: EmitMainEventTargetType.WINDOW_TYPES; windowTypes: WindowType[] };
export const windowsKey = createKey<Windows>("windows");
export const useWindows = createUseFunction(windowsKey);
