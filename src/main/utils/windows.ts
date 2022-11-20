import { ToFrontFunctions } from "@/commons/ipc/toFrontFunctions";
import { Settings } from "@/commons/datas/settings";
import { WindowStates } from "@/commons/datas/windowStates";
import { WindowType } from "@/commons/datas/windowType";
import {
  BOARD_DARK_BACKGROUND_FILL_COLOR,
  BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
  EULA,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_EULA_HEIGHT,
  WINDOW_EULA_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_SETTINGS_HEIGHT,
  WINDOW_SETTINGS_WIDTH,
} from "@/commons/defines";
import { app, BrowserWindow, IpcMainInvokeEvent, screen } from "electron";
import Config from "@/main/storages/config";
import { MainLogger } from "@/main/utils/mainLogger";
import * as Path from "path";
import { Vec2 } from "@/commons/utils/vec2";
import { createKey } from "@/main/utils/di";
export class Windows {
  windows: { [key in WindowType]?: BrowserWindow | undefined } = {};
  activeWindows: { [key in WindowType]?: boolean } = {};
  mainWindowType: WindowType | undefined;
  constructor(
    private mainLogger: MainLogger,
    private configSettings: Config<Settings>,
    private configWindowStates: Config<WindowStates>,
    private isDarkMode: () => boolean,
  ) {
    //
  }
  onCloseWindow(type: WindowType) {
    this.mainLogger.logChunk().log("$Close Window:", type);
    this.saveWindowSize(type);
    this.activeWindows[type] = false;
    if (this.activeWindows.board) {
      this.changeMainWindow(WindowType.BOARD);
    } else if (this.activeWindows.browser) {
      this.changeMainWindow(WindowType.BROWSER);
    } else if (this.activeWindows.details) {
      this.changeMainWindow(WindowType.DETAILS);
    } else if (this.activeWindows.capture) {
      this.changeMainWindow(WindowType.CAPTURE);
    } else {
      if (process.platform !== "darwin") {
        app.quit();
      }
    }
  }
  showWindows() {
    if (this.configSettings.data.eula < EULA) {
      if (this.windows.eula === undefined || this.windows.eula.isDestroyed()) {
        this.windows.eula = this.initEULAWindow();
      } else {
        this.windows.eula.moveTop();
      }
      return;
    }
    if (this.configSettings.data.show === "both") {
      this.windows.board = this.initBoardWindow();
      this.windows.browser = this.initBrowserWindow();
    } else if (this.configSettings.data.show === "browser") {
      this.windows.browser = this.initBrowserWindow();
    } else {
      this.windows.board = this.initBoardWindow();
    }
  }
  createWindow(type: WindowType, options: Electron.BrowserWindowConstructorOptions) {
    const window = new BrowserWindow({
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: Path.join(__dirname, "preload.js"),
      },
      backgroundColor: this.isDarkMode()
        ? BOARD_DARK_BACKGROUND_FILL_COLOR
        : BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      ...options,
    });
    this.activeWindows[type] = true;
    const state = this.configWindowStates.data[type];
    this.mainLogger.logChunk().log("$Create Window:", type);
    window.setMenuBarVisibility(false);
    if (state?.maximized) {
      window.maximize();
    }
    window.on("close", () => {
      this.onCloseWindow(type);
    });
    window.addListener("blur", () => {
      this.emitMainEvent("windowFocused", false, type);
    });
    window.addListener("focus", () => {
      this.emitMainEvent("windowFocused", true, type);
      if (
        type === WindowType.BOARD ||
        type === WindowType.BROWSER ||
        type === WindowType.DETAILS ||
        type === WindowType.CAPTURE
      ) {
        this.changeMainWindow(type);
      }
      window.moveTop();
    });
    const url =
      process.env.WEBPACK_DEV_SERVER_URL !== undefined
        ? `${process.env.WEBPACK_DEV_SERVER_URL}${type}`
        : `app://./${type}.html`;
    window.loadURL(url);
    return window;
  }
  changeMainWindow(type: WindowType) {
    this.mainWindowType = type;
    this.emitMainEvent("mainWindowType", type);
  }
  initBrowserWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.BROWSER, {
      width: this.configWindowStates.data.browser?.width,
      height: this.configWindowStates.data.browser?.height,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  initSettingsWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.SETTINGS, {
      width: WINDOW_SETTINGS_WIDTH,
      height: WINDOW_SETTINGS_HEIGHT,
      minWidth: WINDOW_SETTINGS_WIDTH,
      minHeight: WINDOW_SETTINGS_HEIGHT,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  initBoardWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.BOARD, {
      width: this.configWindowStates.data.board?.width,
      height: this.configWindowStates.data.board?.height,
      trafficLightPosition: {
        x: 13,
        y: 13,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  initDetailsWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.DETAILS, {
      width: this.configWindowStates.data.details?.width,
      height: this.configWindowStates.data.details?.height,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  initCaptureWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.CAPTURE, {
      width: this.configWindowStates.data.capture?.width,
      height: this.configWindowStates.data.capture?.height,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  initEULAWindow(x?: number, y?: number) {
    return this.createWindow(WindowType.EULA, {
      width: WINDOW_EULA_WIDTH,
      height: WINDOW_EULA_HEIGHT,
      minWidth: WINDOW_EULA_WIDTH,
      minHeight: WINDOW_EULA_HEIGHT,
      trafficLightPosition: {
        x: 8,
        y: 8,
      },
      x,
      y,
      alwaysOnTop: this.configSettings.data.alwaysOnTop,
    });
  }
  saveWindowSize(windowType: WindowType) {
    this.mainLogger.logChunk().log("$Save Window States:", windowType);
    let state = this.configWindowStates.data[windowType];
    if (state === undefined) {
      state = this.configWindowStates.data[windowType] = {
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
    this.configWindowStates.save();
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
    try {
      this.windows[type]?.reload();
    } catch {
      //
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
  openWindow(windowType: WindowType, event?: IpcMainInvokeEvent) {
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
      switch (windowType) {
        case WindowType.BOARD:
          this.windows[windowType] = this.initBoardWindow(position.x, position.y);
          break;
        case WindowType.BROWSER:
          this.windows[windowType] = this.initBrowserWindow(position.x, position.y);
          break;
        case WindowType.SETTINGS:
          this.windows[windowType] = this.initSettingsWindow(position.x, position.y);
          break;
        case WindowType.DETAILS:
          this.windows[windowType] = this.initDetailsWindow(position.x, position.y);
          break;
        case WindowType.CAPTURE:
          this.windows[windowType] = this.initCaptureWindow(position.x, position.y);
          break;
        case WindowType.EULA:
          this.windows[windowType] = this.initEULAWindow(position.x, position.y);
          break;
      }
      this.windows[windowType]?.center();
    } else {
      this.windows[windowType]?.moveTop();
      this.windows[windowType]?.focus();
    }
  }
  emitMainEvent<U extends keyof ToFrontFunctions>(
    key: U,
    ...args: Parameters<ToFrontFunctions[U]>
  ): void {
    Object.values(this.windows).forEach((window) => {
      if (window !== undefined && !window.isDestroyed()) {
        window.webContents.send(key, ...args);
      }
    });
  }
}
export const windowsKey = createKey<Windows>("windows");
