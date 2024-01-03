import { app } from "electron";

import { DB_COMPACTION_RETRY_COUNT } from "@/commons/defines";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBS } from "@/main/provides/databases";
import { useWindows } from "@/main/provides/windows";

export class Quit {
  async quit(force = false) {
    // if (force) {
    //   app.exit();
    //   return;
    // }
    // const windows = useWindows();
    // windows.openWindow("quit");
    // await new Promise((res) => {
    //   setTimeout(res, 500);
    // });
    // await useDBS().waitUntilKillable();
    app.exit();
  }
  relaunch(force = false) {
    app.relaunch();
    this.quit(force);
  }
}
export const quitKey = createKey<Quit>("quit");
export const useQuit = createUseFunction(quitKey);
