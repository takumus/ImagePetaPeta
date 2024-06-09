import { ImportFileAdditionalData } from "@/commons/datas/importFileGroup";
import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";

export interface MessagesToBackground {
  orderSave: (
    urls: string[],
    referrer: string,
    ua: string,
    additional?: ImportFileAdditionalData,
  ) => Promise<void>;
  capture: (
    url: string,
    rect?: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) => Promise<string[] | undefined>;
  save: () => Promise<string[] | undefined>;
  setRightClickEnable: (value: boolean) => Promise<void>;
  getRightClickEnable: () => Promise<boolean>;
  clearImageURLs: () => Promise<void>;
  addPageDownloaderDatas: (urls: PageDownloaderData) => Promise<void>;
  requestPageDownloaderDatas: (inView: boolean) => Promise<void>;
  getInjectStyle: () => Promise<string>;
}
export interface MessagesToContent {
  openMenu: () => Promise<void>;
  requestPageDownloaderDatas: (inView: boolean) => Promise<void>;
}
