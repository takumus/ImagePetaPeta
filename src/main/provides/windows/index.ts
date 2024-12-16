import * as Path from "node:path";
import { BrowserWindow, IpcMainInvokeEvent, screen } from "electron";
import { string } from "yargs";

import {
  EULA,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from "@/commons/defines";
import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { IpcEventsType } from "@/commons/ipc/ipcEventsType";
import { Vec2 } from "@/commons/utils/vec2";
import { WindowName } from "@/commons/windows";

import { createKey, createUseFunction } from "@/main/libs/di";
import {
  useConfigLibrary,
  useConfigSecureFilePassword,
  useConfigSettings,
  useConfigWindowStates,
} from "@/main/provides/configs";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useLogger } from "@/main/provides/utils/logger";
import { useQuit } from "@/main/provides/utils/quit";
import { windowIs } from "@/main/provides/utils/windowIs";
import { keepAliveWindowNames } from "@/main/provides/windows/keepAliveWindowNames";
import { windowCustomOptions } from "@/main/provides/windows/windowCustomOptions";
import { getStyle } from "@/main/utils/darkMode";
import { getDirname } from "@/main/utils/dirname";

export class Windows {
  windows: { [key in WindowName]?: BrowserWindow | undefined } = {};
  activeWindows: { [key in WindowName]?: boolean } = {};
  mainWindowName: WindowName | undefined;
  onCloseWindow(type: WindowName) {
    const quit = useQuit();
    useLogger().logChunk("Windows.onCloswWindow").debug(type);
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
    const configLibrary = useConfigLibrary();
    const log = useLogger().logChunk("Windows.showWindows");
    if (configSettings.data.eula < EULA) {
      if (windowIs.dead("eula")) {
        this.openWindow("eula");
        log.debug("show eula");
      } else {
        this.windows.eula?.moveTop();
      }
      return;
    }
    try {
      if (configLibrary.data.secure) {
        useConfigSecureFilePassword().getKey();
      }
    } catch (error) {
      log.debug("show password");
      this.openWindow("password");
      useConfigSecureFilePassword().events.on("change", async () => {
        // await usePetaFilesController().encryptAll("decrypt");
        if (windowIs.alive(this.windows.password)) {
          this.windows.password.close();
        }
        this.showWindows();
      });
      return;
    }
    log.debug("show", configSettings.data.show);
    if (configSettings.data.show === "both") {
      this.openWindow("board");
      this.openWindow("browser");
    } else if (configSettings.data.show === "browser") {
      this.openWindow("browser");
    } else {
      this.openWindow("board");
    }
  }
  openWindow(windowName: WindowName, event?: IpcMainInvokeEvent | BrowserWindow, modal = false) {
    const log = useLogger().logChunk("Windows.openWindow");
    log.debug(windowName, "modal:", modal);
    const position = new Vec2();
    const window =
      event !== undefined
        ? event instanceof BrowserWindow
          ? event
          : this.getWindowByEvent(event)?.window
        : undefined;
    try {
      const parentWindowBounds = window ? window.getBounds() : undefined;
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
    if (windowIs.dead(windowName)) {
      this.windows[windowName] = this.createWindow(windowName, {
        ...windowCustomOptions[windowName],
        x: position.x,
        y: position.y,
        modal,
        parent: window && modal ? window : undefined,
      });
      this.windows[windowName]?.center();
      this.setEnvParam(this.windows[windowName]);
    } else {
      this.windows[windowName]?.moveTop();
      this.windows[windowName]?.focus();
    }
    return this.windows[windowName] as BrowserWindow;
  }
  private setEnvParam(window?: BrowserWindow) {
    if (window === undefined) {
      return;
    }
    if (import.meta.env.VITE_OPEN_DEVTOOL === "true") {
      window.webContents.openDevTools();
      window.setSize(window.getSize()[0] + 400, window.getSize()[1]);
    }
    if (import.meta.env.VITE_DEFAULT_WINDOW_POSITION !== undefined) {
      window.setPosition(
        ...(JSON.parse(import.meta.env.VITE_DEFAULT_WINDOW_POSITION) as [number, number]),
      );
    }
  }
  createWindow(type: WindowName, options: Electron.BrowserWindowConstructorOptions) {
    const configWindowStates = useConfigWindowStates();
    const logger = useLogger().logChunk("Windows.createWindow");
    const window = new BrowserWindow({
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      fullscreenable: false,
      fullscreen: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: Path.join(getDirname(import.meta.url), "preload.cjs"),
      },
      backgroundColor: getStyle()["--color-0"],
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
    logger.debug(type);
    window.setMenuBarVisibility(false);
    window.on("close", () => this.onCloseWindow(type));
    window.addListener("focus", () => {
      if (keepAliveWindowNames.includes(type)) {
        this.changeMainWindow(type);
      }
      window.moveTop();
    });
    // window.webContents.addListener("crashed", () => {
    //   logger.error("Window Crashed:", type);
    //   this.reloadWindow(type);
    // });
    if (process.env.VITE_DEV_SERVER_URL) {
      const url = new URL(`/windows/${type}.html`, process.env.VITE_DEV_SERVER_URL).href;
      logger.debug("url:", url);
      window.loadURL(url);
    } else {
      const path = Path.resolve(getDirname(import.meta.url), `../renderer/windows/${type}.html`);
      logger.debug("path:", path);
      window.loadFile(path);
    }
    return window;
  }
  changeMainWindow(type: WindowName) {
    this.mainWindowName = type;
  }
  saveWindowSize(windowName: WindowName) {
    const configWindowStates = useConfigWindowStates();
    useLogger().logChunk("Windows.saveWindowSize").debug(windowName);
    let state = configWindowStates.data[windowName];
    if (state === undefined) {
      state = configWindowStates.data[windowName] = {
        width: WINDOW_DEFAULT_WIDTH,
        height: WINDOW_DEFAULT_HEIGHT,
      };
    }
    const window = this.windows[windowName];
    if (windowIs.dead(window)) {
      return;
    }
    if (!window?.isMaximized()) {
      state.width = window?.getSize()[0] || WINDOW_DEFAULT_WIDTH;
      state.height = window?.getSize()[1] || WINDOW_DEFAULT_HEIGHT;
    }
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
          windowIs.alive(windowInfo.window) &&
          windowInfo.window?.webContents.mainFrame === event.sender.mainFrame
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
    if (windowIs.alive(this.windows[type])) {
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
  readonly emit = (() => {
    const emitMainEvent = this.emitMainEvent.bind(this);
    const proxies: { [key: string]: any } = {};
    return new Proxy<IpcEventsType>({} as any, {
      get(_target, p1: any, _receiver: any) {
        if (proxies[p1] === undefined) {
          proxies[p1] = new Proxy<any>({} as any, {
            get(_target: any, p2: any, _receiver: any) {
              return (target: EmitMainEventTarget, ...args: any) => {
                emitMainEvent(target, p1, p2, ...args);
              };
            },
          });
        }
        return proxies[p1];
      },
    });
  })();
  private emitMainEvent<C extends keyof IpcEvents, U extends keyof IpcEvents[C]>(
    target: EmitMainEventTarget,
    p1: C,
    p2: U,
    ...args: Parameters<FunctionGuard<IpcEvents[C][U]>>
  ): void {
    const path = `${p1}.${p2 as string}`;
    if (target.type === "all") {
      Object.values(this.windows).forEach((window) => {
        if (windowIs.alive(window)) {
          window.webContents.send(path, ...args);
        }
      });
    } else if (target.type === "windows") {
      target.windows.forEach((window) => {
        if (windowIs.alive(window)) {
          window.webContents.send(path, ...args);
        }
      });
    } else if (target.type === "windowNames") {
      target.windowNames.forEach((type) => {
        const window = this.windows[type];
        if (windowIs.alive(window)) {
          window.webContents.send(path, ...args);
        }
      });
    }
  }
}
export type EmitMainEventTarget =
  | { type: "all" }
  | { type: "windows"; windows: BrowserWindow[] }
  | { type: "windowNames"; windowNames: WindowName[] };
export type EmitMainEventTargetType = EmitMainEventTarget["type"];
export const windowsKey = createKey<Windows>("windows");
export const useWindows = createUseFunction(windowsKey);
