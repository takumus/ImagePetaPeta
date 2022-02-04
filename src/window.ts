import { app, protocol, BrowserWindow } from "electron"
import { createProtocol } from "vue-cli-plugin-electron-builder/lib"
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer"
import * as path from "path";

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
        width: 1920,
        height: 1080,
        frame: !customTitlebar,
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