import { BrowserWindow, app } from "electron";

import { SUPPORT_URL } from "@/commons/defines";

import { useWindows } from "@/main/provides/windows";

export interface ErrorWindowParameters {
  category: "M" | "R";
  code: number;
  title: string;
  message: string;
}
export function showErrorWindow(error: ErrorWindowParameters, quit = true) {
  function createWindow() {
    const errorWindow = new BrowserWindow({
      width: 512,
      height: 512,
      frame: true,
      show: true,
      webPreferences: {
        javascript: true,
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    errorWindow.menuBarVisible = false;
    errorWindow.center();
    errorWindow.loadURL(
      `data:text/html;charset=utf-8,
      <head>
      <title>${noHtml(app.getName())} Fatal Error</title>
      <style>pre { word-break: break-word; } * { font-family: monospace; }</style>
      </head>
      <body>
      <h1>${noHtml(error.category)}${noHtml(("000" + error.code).slice(-3))} ${noHtml(
        error.title,
      )}</h1>
      <pre>Verison: ${app.getVersion()}</pre>
      <pre>Message: ${noHtml(error.message)}</pre>
      <h2><a href="javascript:require('electron').shell.openExternal('${SUPPORT_URL}?usp=pp_url&entry.1300869761=%E3%83%90%E3%82%B0&entry.1709939184=${encodeURIComponent(
        app.getVersion(),
      )}');">SUPPORT</a></h2>
      </body>`,
    );
    errorWindow.moveTop();
    errorWindow.on("close", () => {
      if (quit) {
        app.exit();
      }
    });
  }
  if (app.isReady()) {
    createWindow();
  } else {
    app.on("ready", createWindow);
  }
}
export function showError(error: ErrorWindowParameters, quit = true) {
  try {
    const windows = useWindows();
    Object.values(windows.windows).forEach((window) => {
      if (window !== undefined && !window.isDestroyed()) {
        window.loadURL("about:blank");
      }
    });
  } catch {
    //
  }
  showErrorWindow(error, quit);
}
export function noHtml(str: string | null | undefined) {
  return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
