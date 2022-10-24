import { PetaImage } from "@/commons/datas/petaImage";
import { SEARCH_IMAGE_BY_GOOGLE_TIMEOUT } from "@/commons/defines";
import { BrowserWindow, shell, WebContents } from "electron";
import * as Path from "path";
import * as Tasks from "@/mainProcess/tasks/task";
import { ppa } from "@/commons/utils/pp";
type SearchImageByGoogleTaskStep = { js: string } | { wait: number };
export interface SearchImageByGoogleTask {
  url: string;
  beforeSteps: SearchImageByGoogleTaskStep[];
  afterSteps: SearchImageByGoogleTaskStep[];
  inputElement: {
    selector: string;
  };
  redirectURLRegExp: {
    pattern: string;
    flags: string;
  };
}
const task: SearchImageByGoogleTask = {
  url: "https://images.google.com/",
  beforeSteps: [
    {
      wait: 1000,
    },
    {
      js: `document.querySelector("div[data-is-images-mode='true']").click();`,
    },
    {
      wait: 1000,
    },
  ],
  afterSteps: [],
  inputElement: {
    selector: "input[name=encoded_image]",
  },
  redirectURLRegExp: {
    pattern: "/search?",
    flags: "g",
  },
};
async function steps(
  webContents: WebContents,
  steps: SearchImageByGoogleTaskStep[],
  progress: (step: SearchImageByGoogleTaskStep) => void,
) {
  await ppa(async (step) => {
    if ("js" in step) {
      await webContents.executeJavaScript(step.js, false);
    } else if ("wait" in step) {
      await new Promise((res) => setTimeout(res, step.wait));
    }
    progress(step);
  }, steps).promise;
}
export async function searchImageByGoogle(petaImage: PetaImage, dirThumbnails: string) {
  const taskAllCount = 3 + task.afterSteps.length + task.beforeSteps.length;
  let taskCount = 0;
  return Tasks.spawn(
    "Search Image By Google",
    async (handler, petaImage: PetaImage) => {
      handler.emitStatus({
        i18nKey: "tasks.searchImageByGoogle",
        progress: {
          all: taskAllCount,
          current: taskCount++,
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
        await window.loadURL(task.url);
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: taskAllCount,
            current: taskCount++,
          },
          log: [`loaded: ${task.url}`],
          status: "progress",
          cancelable: false,
        });
        window.webContents.debugger.attach("1.1");
        // ルート取る
        const document = await window.webContents.debugger.sendCommand("DOM.getDocument", {});
        // 前処理
        await steps(window.webContents, task.beforeSteps, (step) => {
          handler.emitStatus({
            i18nKey: "tasks.searchImageByGoogle",
            progress: {
              all: taskAllCount,
              current: taskCount++,
            },
            log: [JSON.stringify(step)],
            status: "progress",
            cancelable: false,
          });
        });
        // インプット取得
        const input = await window.webContents.debugger.sendCommand("DOM.querySelector", {
          nodeId: document.root.nodeId,
          selector: task.inputElement.selector,
        });
        // ファイル選択
        await window.webContents.debugger.sendCommand("DOM.setFileInputFiles", {
          nodeId: input.nodeId,
          files: [imageFilePath],
        });
        // 後処理
        await steps(window.webContents, task.afterSteps, (step) => {
          handler.emitStatus({
            i18nKey: "tasks.searchImageByGoogle",
            progress: {
              all: taskAllCount,
              current: taskCount++,
            },
            log: [JSON.stringify(step)],
            status: "progress",
            cancelable: false,
          });
        });
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: taskAllCount,
            current: taskCount++,
          },
          log: [`uploading`],
          status: "progress",
          cancelable: false,
        });
        await new Promise((res, rej) => {
          const timeoutHandler = setTimeout(() => {
            rej("timeout");
          }, SEARCH_IMAGE_BY_GOOGLE_TIMEOUT);
          window.webContents.addListener("did-finish-load", () => {
            if (
              !window.webContents
                .getURL()
                .match(new RegExp(task.redirectURLRegExp.pattern, task.redirectURLRegExp.flags))
            ) {
              return;
            }
            shell.openExternal(window.webContents.getURL());
            clearTimeout(timeoutHandler);
            handler.emitStatus({
              i18nKey: "tasks.searchImageByGoogle",
              progress: {
                all: taskAllCount,
                current: taskCount++,
              },
              log: [`uploaded`],
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
            all: taskAllCount,
            current: taskCount++,
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
