import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { BrowserWindow, screen } from "electron";
import * as Path from "path";
export class DraggingPreviewWindow {
  private draggingPreviewWindow: BrowserWindow | undefined;
  private visible = false;
  private followCursorTimeoutHandler: NodeJS.Timeout | undefined;
  constructor(private width = 256, private height = 256) {
    this.createWindow();
  }
  get window() {
    return this.draggingPreviewWindow;
  }
  private followCursor = () => {
    this.unfollowCursor();
    if (this.visible) {
      const point = screen.getCursorScreenPoint();
      this.move(point.x, point.y);
    }
    this.followCursorTimeoutHandler = setTimeout(this.followCursor, 0);
  }
  private unfollowCursor() {
    if (this.followCursorTimeoutHandler) {
      clearTimeout(this.followCursorTimeoutHandler);
    }
  }
  createWindow() {
    try {
      if (this.draggingPreviewWindow) {
        this.draggingPreviewWindow.destroy();
      }
    } catch (error) {
      //
    }
    this.draggingPreviewWindow = new BrowserWindow({
      width: this.width,
      height: this.height,
      resizable: false,
      frame: false,
      show: true,
      alwaysOnTop: true,
      transparent: true,
      focusable: false,
      closable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: Path.join(__dirname, "preload.js"),
        javascript: false,
      },
    });
    this.draggingPreviewWindow.setIgnoreMouseEvents(true);
    this.draggingPreviewWindow.setMenuBarVisibility(false);
    this.draggingPreviewWindow.setOpacity(0);
  }
  setVisible(value: boolean) {
    if (value) {
      this.followCursor();
    } else {
      this.unfollowCursor();
    }
    try {
      this.draggingPreviewWindow?.setOpacity(value ? 0.7 : 0);
      this.draggingPreviewWindow?.moveTop();
      this.visible = value;
    } catch(error) {
      //
    }
  }
  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  move(x: number, y: number) {
    try {
      this.draggingPreviewWindow?.setBounds({
        width: Math.floor(this.width),
        height: Math.floor(this.height),
        x: Math.floor(x - this.width / 2),
        y: Math.floor(y - this.height / 2)
      });
    } catch(error) {
      //
    }
  }
  setPetaImages(petaImages: PetaImage[]) {
    try {
      const first = petaImages[0];
      if (!first) {
        return;
      }
      this.draggingPreviewWindow?.loadURL(
        `data:text/html;charset=utf-8,
        <head>
        <style>html, body { margin: 0px; padding: 0px; background-color: transparent; } img { width: 100%; height: 100%; }</style>
        </head>
        <body>
        <img src="${getImageURL(first, ImageType.THUMBNAIL)}">
        </body>`
      );
    } catch(error) {
      //
    }
  }
  clearImages() {
    try {
      this.draggingPreviewWindow?.loadURL(
        `data:text/html;charset=utf-8,
        <head>
        <style>html, body { background-color: transparent; }</style>
        </head>
        <body>
        </body>`
      );
    } catch(error) {
      //
    }
  }
}