import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { TaskStatusWithIndex } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowName } from "@/commons/windows";

import { Style } from "@/renderer/styles/styles";

export interface IpcEvents {
  petaFiles: {
    update: (petaFiles: PetaFile[], mode: UpdateMode) => void;
    regenerateProgress: (done: number, count: number) => void;
    regenerateBegin: () => void;
    regenerateComplete: () => void;
  };
  petaTags: {
    update: (updates: { petaTagIds: string[]; petaFileIds: string[] }) => void;
  };
  petaTagPartitions: {
    update: (petaTagPartition: PetaTagPartition[], mode: UpdateMode) => void;
  };
  settings: {
    update: (settings: Settings) => void;
  };
  initialization: {
    complete: () => void;
    progress: (log: string) => void;
  };
  states: {
    update: (states: States) => void;
  };
  tasks: {
    status: (tasks: { [id: string]: TaskStatusWithIndex }) => void;
  };
  pageDownloader: {
    update: (urls: PageDownloaderData[]) => void;
  };
  modals: {
    update: () => void;
  };
  common: {
    foundLatestVersion: (remote: RemoteBinaryInfo) => void;
    showNSFW: (value: boolean) => void;
    detailsPetaFile: (petaFile: PetaFile) => void;
    style: (value: Style) => void;
    openInBrowser: (petaFileID: string) => void;
  };
}
