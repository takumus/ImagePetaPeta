import { BrowserWindow } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
// import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer"
import * as path from "path";
import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/defines";

export async function createWindow(): Promise<BrowserWindow> {
  // Scheme must be registered before the app is ready
  const win = new BrowserWindow({
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
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    createProtocol("app");
    await win.loadURL("app://./index.html");
  }
  win.setMenuBarVisibility(false);
  return win;
}