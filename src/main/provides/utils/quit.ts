import { app } from "electron";

import { createKey, createUseFunction } from "@/main/libs/di";

export class Quit {
  force() {
    app.quit();
  }
  request() {
    app.quit();
  }
}
export const quitKey = createKey<Quit>("quit");
export const useQuit = createUseFunction(quitKey);
