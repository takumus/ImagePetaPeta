import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { usePageDownloaderCache } from "@/main/provides/pageDownloaderCache";
import { useWindows } from "@/main/provides/windows";

export const downloaderIPCFunctions: IpcFunctionsType["downloader"] = {
  async open(_, log, urls) {
    const windows = useWindows();
    _urls = urls;
    windows.openWindow("pageDownloader");
    usePageDownloaderCache().clear();
  },
  async add(_, log, urls) {
    _urls = [...urls, ..._urls];
    const windows = useWindows();
    windows.emitMainEvent(
      { type: "windowNames", windowNames: ["pageDownloader"] },
      "updatePageDownloaderDatas",
      _urls,
    );
  },
  async getAll() {
    return _urls;
  },
};
let _urls: PageDownloaderData[] = [];
