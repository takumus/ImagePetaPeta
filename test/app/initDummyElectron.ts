import { resolve } from "path";
import { vi } from "vitest";

import { initDB } from "@/main/initDB";
import { clearProvides } from "@/main/libs/di";

export async function initDummyElectron(root: string) {
  vi.mock("electron", () => {
    return {
      BrowserWindow: class {
        constructor(...args: any[]) {}
        center() {}
        moveTop() {}
        focus() {}
        isDestroyed() {
          return false;
        }
        reload() {}
        webContents = {
          send(...args: any[]) {},
        };
      },
      app: {
        isReady() {
          return true;
        },
        getName() {
          return "ImagePetaPeta-beta";
        },
        getVersion() {
          return "1.0.0";
        },
      },
    };
  });
  vi.mock("@/main/errorWindow", () => {
    return {
      showError(...args: any[]) {
        //
      },
    };
  });
  vi.mock("@/main/provides/utils/logger", () => {
    return {
      loggerKey: { key: "logger" },
      Logger: class {
        logMainChunk() {
          return {
            log() {
              //
            },
            error() {
              //
            },
          };
        }
      },
      useLogger() {
        return {
          logMainChunk() {
            return {
              log() {
                //
              },
              error() {
                //
              },
            };
          },
        };
      },
    };
  });
  const { initDI } = await import("@/main/initDI");
  clearProvides();
  initDI({
    logs: resolve(root, "logs"),
    app: resolve(root, "appData"),
    temp: resolve(root, "temp"),
    default: resolve(root, "petaFiles"),
  });
  await initDB();
}