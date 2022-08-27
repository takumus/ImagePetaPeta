import { PetaImage } from "@/commons/datas/petaImage";
import { SEARCH_IMAGE_BY_GOOGLE_TIMEOUT, SEARCH_IMAGE_BY_GOOGLE_URL } from "@/commons/defines";
import { BrowserWindow, shell } from "electron";
import * as Path from "path";
import * as Tasks from "@/mainProcess/tasks/task";
export async function searchImageByGoogle(petaImage: PetaImage, dirThumbnails: string) {
  return Tasks.spawn(
    "Search Image By Google",
    async (handler, petaImage: PetaImage) => {
      handler.emitStatus({
        i18nKey: "tasks.searchImageByGoogle",
        progress: {
          all: 3,
          current: 0,
        },
        log: [],
        status: "begin",
        cancelable: false,
      });
      const imageFilePath = Path.resolve(dirThumbnails, petaImage.file.thumbnail);
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true,
        },
      });
      try {
        await window.loadURL(SEARCH_IMAGE_BY_GOOGLE_URL);
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 1,
          },
          log: [`loaded: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
          status: "progress",
          cancelable: false,
        });
        await new Promise((res) => {
          setTimeout(res, 1000);
        });
        window.webContents.debugger.attach("1.1");
        const document = await window.webContents.debugger.sendCommand("DOM.getDocument", {});
        const input = await window.webContents.debugger.sendCommand("DOM.querySelector", {
          nodeId: document.root.nodeId,
          selector: "input[name=encoded_image]",
        });
        await window.webContents.debugger.sendCommand("DOM.setFileInputFiles", {
          nodeId: input.nodeId,
          files: [imageFilePath],
        });
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 2,
          },
          log: [`uploading: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
          status: "progress",
          cancelable: false,
        });
        await new Promise((res, rej) => {
          const timeoutHandler = setTimeout(() => {
            rej("timeout");
          }, SEARCH_IMAGE_BY_GOOGLE_TIMEOUT);
          window.webContents.addListener("did-finish-load", () => {
            shell.openExternal(window.webContents.getURL());
            clearTimeout(timeoutHandler);
            handler.emitStatus({
              i18nKey: "tasks.searchImageByGoogle",
              progress: {
                all: 3,
                current: 3,
              },
              log: [`uploaded: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
              status: "complete",
              cancelable: false,
            });
            res(true);
          });
        });
      } catch (error) {
        window.destroy();
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 3,
          },
          log: [],
          status: "failed",
          cancelable: false,
        });
        throw error;
      }
      window.destroy();
      return true;
    },
    petaImage,
    false,
  );
}
