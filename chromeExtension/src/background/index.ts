import { _alert } from "$/background/alert";
import { checkApp } from "$/background/checkApp";
import { getCurrentTab } from "$/background/getCurrentTab";
import { MessagesToBackground } from "$/commons/messages";
import { sendToApp } from "$/commons/sendToApp";
import { sendToContent } from "$/commons/sendToContent";

import { ImportFileAdditionalData, ImportFileGroup } from "@/commons/datas/importFileGroup";

let order:
  | {
      urls: string[];
      referrer: string;
      ua: string;
      additionalData?: ImportFileAdditionalData;
    }
  | undefined;
let enabled = false;
type MessagesToBackgroundType = {
  [P in keyof MessagesToBackground]: (
    event: chrome.runtime.MessageSender,
    ...args: Parameters<MessagesToBackground[P]>
  ) => ReturnType<MessagesToBackground[P]>;
};
const messageFunctions: MessagesToBackgroundType = {
  async orderSave(sender, urls, referrer, ua, additionalData) {
    order = {
      urls,
      referrer,
      ua,
      additionalData,
    };
  },
  async setRightClickEnable(sender, value) {
    enabled = value;
  },
  async save() {
    if (!(await checkApp())) {
      return undefined;
    }
    if (order === undefined) {
      return undefined;
    }
    const { urls, referrer, additionalData, ua } = order;
    order = undefined;
    try {
      const result = await sendToApp("importer", "import", [
        [
          ...urls.map(
            (url: string) =>
              ({
                type: "url",
                referrer: referrer,
                url,
                ua,
                additionalData,
              }) as ImportFileGroup[number],
          ),
        ],
      ]);
      return result;
    } catch {
      //
    }
    return undefined;
  },
  async getRightClickEnable() {
    return enabled;
  },
  async capture(sender, url, rect) {
    if (!(await checkApp())) {
      return undefined;
    }
    if (sender.tab === undefined) {
      return;
    }
    let imageDataURL = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      quality: 100,
      format: "png",
    });
    if (rect !== undefined) {
      const imageBitmap = await createImageBitmap(await fetch(imageDataURL).then((r) => r.blob()));
      const x = Math.floor(rect.x * imageBitmap.width);
      const y = Math.floor(rect.y * imageBitmap.height);
      const width = Math.floor(rect.width * imageBitmap.width);
      const height = Math.floor(rect.height * imageBitmap.height);
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d")?.drawImage(imageBitmap, -x, -y);
      imageDataURL = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = async () => {
          res(reader.result as string);
        };
        canvas.convertToBlob({ quality: 100 }).then(reader.readAsDataURL.bind(reader));
      });
    }
    return await sendToApp("importer", "import", [
      [
        {
          type: "url",
          url: imageDataURL,
          additionalData: {
            name: "capture",
            note: url,
          },
        },
      ] as ImportFileGroup,
    ]);
  },
  async addPageDownloaderDatas(_event, urls) {
    await sendToApp("downloader", "add", [urls]);
  },
  async clearImageURLs(event) {
    //
  },
  async requestPageDownloaderDatas(event, inView) {
    const tab = await getCurrentTab();
    if (tab?.id !== undefined) {
      requestPageDownloaderDatas(tab.id, inView);
    }
  },
  async getInjectStyle() {
    const style = await (await fetch(chrome.runtime.getURL("contents/ui/index.css"))).text();
    return style;
  },
};
async function requestPageDownloaderDatas(tabId: number, inView: boolean) {
  console.log("GAI");
  if (!(await checkApp())) {
    return undefined;
  }
  await sendToApp("downloader", "open", []);
  await sendToContent(tabId, "requestPageDownloaderDatas", inView);
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  console.log(changeInfo.status);
});
chrome.runtime.onMessage.addListener((request, sender, response) => {
  // console.log(request, sender);
  (messageFunctions as any)[request.type](sender, ...request.args).then((res: any) => {
    // console.log(`res:`, res);
    response({
      value: res,
    });
  });
  return true;
});
chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case "openMenu":
      if (tab.id !== undefined) {
        sendToContent(tab.id, "openMenu");
      }
      break;
    case "reload":
      chrome.runtime.reload();
      break;
  }
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "saveImage":
      if (tab?.id !== undefined) {
        sendToContent(tab.id, "openMenu");
      }
      break;
    case "downloadPageView":
      if (tab?.id !== undefined) {
        requestPageDownloaderDatas(tab.id, true);
      }
      break;
    case "downloadPageAll":
      if (tab?.id !== undefined) {
        requestPageDownloaderDatas(tab.id, false);
      }
      break;
  }
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveImage",
    contexts: ["all"],
    title: "Save Images",
  });
  chrome.contextMenus.create({
    id: "downloadPageView",
    contexts: ["all"],
    title: "Download Page (view)",
  });
  chrome.contextMenus.create({
    id: "downloadPageAll",
    contexts: ["all"],
    title: "Download Page (all)",
  });
});

// const style = await (
//   await fetch(chrome.runtime.getURL("popup/index-BGiOXsqW.css"))
// ).text();
