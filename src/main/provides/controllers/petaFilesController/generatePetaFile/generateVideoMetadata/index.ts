import { BrowserWindow } from "electron";
import sharp from "sharp";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { getSimplePalette } from "@/main/utils/generateMetadata/generatePalette";

export async function generateVideoMetadata(path: string, ext: string): Promise<GeneratedFileInfo> {
  const debug = false;
  const window = new BrowserWindow({
    show: debug,
    frame: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      offscreen: !debug,
    },
  });
  window.webContents.setAudioMuted(true);
  try {
    try {
      await window.loadFile(path);
    } catch (err) {
      // console.log(err);
    }
    window.webContents.debugger.attach("1.1");
    const size = await new Promise<{ width: number; height: number }>((res, rej) => {
      let result = { width: 0, height: 0 };
      let retryCount = 0;
      const handler = setInterval(async () => {
        try {
          await window.webContents.executeJavaScript(
            `var videoElement = document.querySelector('video');`,
          );
          await window.webContents.executeJavaScript(
            `videoElement.autoplay = false; videoElement.controls = false; videoElement.muted = true;`,
          );
          result = JSON.parse(
            await window.webContents.executeJavaScript(`
              JSON.stringify({
                width: videoElement.videoWidth,
                height: videoElement.videoHeight
              })`),
          );
          if (result.width > 0 && result.height > 0) {
            clearInterval(handler);
            res(result);
          }
        } catch {
          //
        }
        retryCount++;
        if (retryCount >= 50) {
          clearInterval(handler);
          rej("could not get size");
        }
      }, 100);
    });
    const height = (size.height / size.width) * BROWSER_THUMBNAIL_SIZE;
    window.setSize(BROWSER_THUMBNAIL_SIZE, height);
    const buffer = (await window.capturePage()).toPNG();
    const thumbnailsBuffer = await sharp(buffer, { limitInputPixels: false })
      .resize(BROWSER_THUMBNAIL_SIZE)
      .webp({ quality: BROWSER_THUMBNAIL_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const raw = await sharp(thumbnailsBuffer.data, { limitInputPixels: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const palette =
      getSimplePalette({
        buffer: raw.data,
        width: raw.info.width,
        height: raw.info.height,
      }) || [];
    window.destroy();
    return {
      thumbnail: {
        buffer: thumbnailsBuffer.data,
        extention: "webp",
      },
      extention: ext,
      metadata: {
        type: "video",
        width: size.width,
        height: size.height,
        palette,
        version: PETAIMAGE_METADATA_VERSION,
        lengthMS: 0,
      },
    };
  } catch (error) {
    window.destroy();
    throw error;
  }
}
