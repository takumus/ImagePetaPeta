import { app } from "electron";

import { DB_COMPACTION_RETRY_COUNT } from "@/commons/defines";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBS } from "@/main/provides/databases";
import { useWindows } from "@/main/provides/windows";

function dbKillable() {
  return new Promise<void>((res) => {
    let retryCount = 0;
    const quitIfDBsKillable = () => {
      const dbs = useDBS();
      const killable = dbs.reduce((killable, db) => db.isKillable && killable, true);
      if (killable) {
        res();
        return;
      } else {
        if (retryCount > DB_COMPACTION_RETRY_COUNT) {
          throw new Error("cannot compact dbs");
        }
        setTimeout(quitIfDBsKillable, 1000);
        retryCount++;
      }
    };
    quitIfDBsKillable();
  });
}

export class Quit {
  async quit(force = false) {
    if (force) {
      app.exit();
      return;
    }
    const windows = useWindows();
    windows.openWindow("quit");
    await dbKillable();
    app.exit();
  }
  relaunch(force = false) {
    app.relaunch();
    this.quit(force);
  }
}
export const quitKey = createKey<Quit>("quit");
export const useQuit = createUseFunction(quitKey);
