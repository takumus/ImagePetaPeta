import { MessagesToContent } from "$/commons/messages";
import { sendToBackground } from "$/commons/sendToBackground";
import { getData } from "$/contents/ui/imageParser";

console.log("impt allimage injected:", location.href);
const messageFunctions: MessagesToContent = {
  openMenu: async () => {
    //
  },
  requestPageDownloaderDatas: async (inView) => {
    sendToBackground("addPageDownloaderDatas", {
      urls: Array.from(
        new Set(
          getData(
            inView
              ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
              : undefined,
          )
            .map((d) => d.urls)
            .reduce<string[]>((p, c) => [...p, ...c], []),
        ),
      ),
      referer: location.origin,
      pageURL: location.href,
      pageTitle: document.title,
    });
  },
};
chrome.runtime.onMessage.addListener((request, _, response) => {
  (messageFunctions as any)[request.type](...request.args).then((res: any) => {
    response({
      value: res,
    });
  });
  return true;
});
