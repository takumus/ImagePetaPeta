import * as Path from "node:path";
import { BrowserWindow, shell, WebContents } from "electron";

import { PetaFile } from "@/commons/datas/petaFile";
import { TaskStatusCode } from "@/commons/datas/task";
import { SEARCH_IMAGE_BY_GOOGLE_TIMEOUT } from "@/commons/defines";
import { ppa } from "@/commons/utils/pp";

import { useTasks } from "@/main/provides/tasks";

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
      wait: 2000,
    },
    {
      js: `document.querySelector("div[data-is-images-mode='true']").click();`,
    },
    {
      wait: 2000,
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
export async function searchImageByGoogle(path: string) {
  const tasks = useTasks();
  return tasks.spawn(
    "Search Image By Google",
    async (handler) => {
      const taskAllCount = 3 + task.afterSteps.length + task.beforeSteps.length;
      let taskCount = 0;
      handler.emitStatus({
        i18nKey: "tasks.searchImageByGoogle",
        progress: {
          all: taskAllCount,
          current: taskCount++,
        },
        status: TaskStatusCode.BEGIN,
      });
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true,
        },
      });
      try {
        // ロード
        await window.loadURL(task.url);
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: taskAllCount,
            current: taskCount++,
          },
          log: [`loaded: ${task.url}`],
          status: TaskStatusCode.PROGRESS,
        });
        // デバッガ
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
            status: TaskStatusCode.PROGRESS,
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
          files: [path],
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
            status: TaskStatusCode.PROGRESS,
          });
        });
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: taskAllCount,
            current: taskCount++,
          },
          log: [`uploading`],
          status: TaskStatusCode.PROGRESS,
        });
        // アップロード完了待ち
        await new Promise((res, rej) => {
          // タイムアウト
          const timeoutHandler = setTimeout(() => {
            clearInterval(waitForUploadHandler);
            rej("timeout");
          }, SEARCH_IMAGE_BY_GOOGLE_TIMEOUT);
          const waitForUploadHandler = setInterval(() => {
            // アップロード完了
            if (
              !window.webContents
                .getURL()
                .match(new RegExp(task.redirectURLRegExp.pattern, task.redirectURLRegExp.flags))
            ) {
              return;
            }
            clearInterval(waitForUploadHandler);
            // ブラウザ起動
            shell.openExternal(window.webContents.getURL());
            clearTimeout(timeoutHandler);
            handler.emitStatus({
              i18nKey: "tasks.searchImageByGoogle",
              progress: {
                all: taskAllCount,
                current: taskCount++,
              },
              log: [`uploaded`],
              status: TaskStatusCode.COMPLETE,
            });
            res(true);
          }, 100);
        });
      } catch (error) {
        window.destroy();
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: taskAllCount,
            current: taskCount++,
          },
          log: [String(error)],
          status: TaskStatusCode.FAILED,
        });
        throw error;
      }
      window.destroy();
      return true;
    },
    false,
  );
}
