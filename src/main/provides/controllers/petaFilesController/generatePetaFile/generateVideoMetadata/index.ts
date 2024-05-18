import { BrowserWindow } from "electron";
import { FileTypeResult } from "file-type";
import sharp from "sharp";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { getSimplePalette } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata/generatePalette";

export async function generateVideoMetadata(
  source: { path: string } | { url: string },
  fileType: FileTypeResult,
): Promise<GeneratedFileInfo> {
  if (fileType.mime === "video/quicktime") {
    throw new Error(".mov is not supported");
  }
  const debug = false;
  const window = new BrowserWindow({
    show: debug,
    frame: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      offscreen: !debug,
    },
  });
  window.webContents.setAudioMuted(true);
  try {
    await window.loadURL(url);
    window.webContents.debugger.attach("1.1");
    const document = await window.webContents.debugger.sendCommand("DOM.getDocument", {});
    if ("path" in source) {
      // インプット取得
      const input = await window.webContents.debugger.sendCommand("DOM.querySelector", {
        nodeId: document.root.nodeId,
        selector: "input",
      });
      // ファイル選択
      await window.webContents.debugger.sendCommand("DOM.setFileInputFiles", {
        nodeId: input.nodeId,
        files: [source.path],
      });
    } else {
      await window.webContents.executeJavaScript(`
        var videoElement = document.querySelector('video');
        videoElement.src = "${source.url}"
      `);
    }
    const info = await new Promise<{ size: { width: number; height: number }; duration: number }>(
      (res, rej) => {
        let result = { size: { width: 0, height: 0 }, duration: 0 };
        let retryCount = 0;
        const handler = setInterval(async () => {
          try {
            await window.webContents.executeJavaScript(`
            var videoElement = document.querySelector('video');
            videoElement.autoplay = false;
            videoElement.controls = false;
            videoElement.muted = true;
            videoElement.cuttentTime = 0;
            videoElement.pause();
          `);
            result = JSON.parse(
              await window.webContents.executeJavaScript(`
              JSON.stringify({
                size: {
                  width: videoElement.videoWidth,
                  height: videoElement.videoHeight
                },
                duration: videoElement.duration
              })
            `),
            );
            if (result.size.width > 0 && result.size.height > 0 && result.duration > 0) {
              clearInterval(handler);
              res(result);
            }
          } catch {
            //
          }
          retryCount++;
          if (retryCount >= 5) {
            clearInterval(handler);
            rej("could not get size");
          }
        }, 1000);
      },
    );
    window.setSize(Math.floor(info.size.width), Math.floor(info.size.height));
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
      original: {
        extention: fileType.ext,
      },
      metadata: {
        type: "video",
        width: info.size.width,
        height: info.size.height,
        palette,
        version: PETAIMAGE_METADATA_VERSION,
        duration: info.duration,
        mimeType: fileType.mime,
      },
    };
  } catch (error) {
    window.destroy();
    throw error;
  }
}

const url = `data:text/html;charset=utf-8,
  <head>
  <style>
  body, html {
    margin: 0px;
    padding: 0px;
    overflow: hidden;
  }
  video {
    display: block;
    width: 100%;
    height: 100%;
  }
  input {
    display: none;
  }
  </style>
  </head>
  <body>
  <input type="file" id="videoUpload" />
  <video>
  </video>
  <script>
  document.getElementById("videoUpload")
  .onchange = function(event) {
    let file = event.target.files[0];
    let blobURL = URL.createObjectURL(file);
    document.querySelector("video").src = blobURL;
  }
  </script>
  </body>`.replace(/\n/g, "");
