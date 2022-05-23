import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { BrowserWindow, screen } from "electron";
import * as Path from "path";
import { valueChecker } from "@/commons/utils/valueChecker";
import NSFWImage from "@/@assets/nsfwBackground.png";
export class DraggingPreviewWindow {
  private draggingPreviewWindow: BrowserWindow | undefined;
  private visible = false;
  private followCursorTimeoutHandler: NodeJS.Timeout | undefined;
  private isSameAll = valueChecker().isSameAll;
  constructor(private width = 256, private height = 256) {
    // this.createWindow();
  }
  get window() {
    return this.draggingPreviewWindow;
  }
  private followCursor = () => {
    const point = screen.getCursorScreenPoint();
    if (this.isSameAll(
      "position.x", point.x,
      "position.y", point.y
    )) {
      return;
    }
    this.move(point.x, point.y);
  }
  createWindow() {
    this.destroy();
    this.draggingPreviewWindow = new BrowserWindow({
      width: this.width,
      height: this.height,
      resizable: false,
      frame: false,
      show: true,
      alwaysOnTop: true,
      opacity: 0,
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
    this.followCursor();
    this.draggingPreviewWindow.on("show", () => {
      this.followCursor();
    })
  }
  setVisible(value: boolean) {
    if (this.followCursorTimeoutHandler) {
      clearInterval(this.followCursorTimeoutHandler);
    }
    if (value) {
      this.followCursorTimeoutHandler = setInterval(this.followCursor, 0);
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
  setPetaImages(petaImages: PetaImage[], showNSFW: boolean) {
    try {
      const first = petaImages[0];
      if (!first) {
        return;
      }
      const element = first.nsfw && !showNSFW ? 
      `<t-nsfw style="background-image: url(${NSFWImage})"></t-nsfw>`:
      `<img src="${getImageURL(first, ImageType.THUMBNAIL)}">`;
      this.draggingPreviewWindow?.loadURL(
        `data:text/html;charset=utf-8,
        <head>
        <style>
        html, body {
          margin: 0px; padding: 0px; background-color: transparent;
        }
        img {
          width: 100%; height: 100%;
        }
        t-nsfw {
          width: 100%;
          height: 100%;
          display: block;
          background-size: 32px;
          background-position: center;
          background-repeat: repeat;
          background-image: url("~@/@assets/nsfwBackground.png");
        }
        </style>
        </head>
        <body>
        ${element}
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
  destroy() {
    try {
      this.draggingPreviewWindow?.destroy();
    } catch (error) {
      //
    }
  }
}