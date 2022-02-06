import { app, protocol, BrowserWindow } from "electron"
import { createProtocol } from "vue-cli-plugin-electron-builder/lib"
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer"
import * as path from "path";
import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "./defines";

export async function initWindow(customTitlebar: boolean): Promise<BrowserWindow> {
  return new Promise((res, rej) => {
    if (!app.requestSingleInstanceLock()) app.quit();
    const isDevelopment = process.env.NODE_ENV !== "production"
    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
      { scheme: "app", privileges: { secure: true, standard: true } }
    ])
    let win: BrowserWindow;
    async function createWindow() {
      win = new BrowserWindow({
        width: WINDOW_DEFAULT_WIDTH,
        height: WINDOW_DEFAULT_HEIGHT,
        minWidth: WINDOW_MIN_WIDTH,
        minHeight: WINDOW_MIN_HEIGHT,
        frame: false,
        titleBarStyle: "hiddenInset",
        show: false,
        // transparent: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload:path.join(__dirname, "preload.js")
        }
      });
      res(win);
      win.setMenuBarVisibility(false);

      if (process.env.WEBPACK_DEV_SERVER_URL) {
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
        if (!process.env.IS_TEST) {
          win.webContents.openDevTools({ mode: "detach" });
        }
      } else {
        createProtocol("app")
        await win.loadURL("app://./index.html");
      }
    }
    app.on("window-all-closed", () => {
      app.quit();
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
    app.on("ready", async () => {
      if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
          await installExtension(VUEJS3_DEVTOOLS)
        } catch (e: any) {
          console.error("Vue Devtools failed to install:", e.toString())
        }
      }
      createWindow()
    });
    if (isDevelopment) {
      if (process.platform === "win32") {
        process.on("message", (data) => {
          if (data === "graceful-exit") {
            app.quit()
          }
        })
      } else {
        process.on("SIGTERM", () => {
          app.quit()
        })
      }
    }
  });
}