import { app } from "electron";

import { createKey, createUseFunction } from "@/main/libs/di";

export class Quit {
  quit(force = false) {
    if (force) {
      app.exit();
      return;
    }
    setTimeout(() => {
      this.quit(true);
    }, 1000);
  }
  relaunch(force = false) {
    app.relaunch();
    this.quit(force);
  }
}
export const quitKey = createKey<Quit>("quit");
export const useQuit = createUseFunction(quitKey);
