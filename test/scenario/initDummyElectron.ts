import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { vi } from "vitest";

import { initDB } from "@/main/initDB";
import { initAppDI } from "@/main/initDI";
import { clearProvides, provide } from "@/main/libs/di";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { libraryPathKey } from "@/main/provides/utils/paths";

export async function initDummyElectron(root: string) {
  const key = createHash("sha512").update("1234").digest("hex").substring(0, 32);
  vi.mock("electron", async () => {
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
      safeStorage: {
        encryptString: () => Buffer.from(key),
        decryptString: () => key,
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
  vi.mock("@/commons/defines", async () => {
    const defines = await vi.importActual<typeof import("@/commons/defines")>("@/commons/defines");
    return {
      ...defines,
      DB_COMPACTION_DELAY: 100,
    } as typeof defines;
  });
  vi.mock("@/main/utils/resolveExtraFilesPath", () => {
    return {
      resolveExtraFilesPath: (...path: string[]) => {
        return resolve("_electronTemp", ...path);
      },
    };
  });
  // vi.mock("@/main/provides/utils/logger", () => {
  //   return {
  //     loggerKey: { key: "logger" },
  //     Logger: class {
  //       logMainChunk() {
  //         return {
  //           log() {
  //             //
  //           },
  //           error() {
  //             //
  //           },
  //         };
  //       }
  //     },
  //     useLogger() {
  //       return {
  //         logMainChunk() {
  //           return {
  //             log() {
  //               //
  //             },
  //             error() {
  //               //
  //             },
  //           };
  //         },
  //       };
  //     },
  //   };
  // });
  const { initLibraryDI: initDI } = await import("@/main/initDI");
  clearProvides();
  initAppDI({
    logs: resolve(root, "logs"),
    app: resolve(root, "appData"),
    temp: resolve(root, "temp"),
    default: resolve(root, "petaFiles"),
  });
  initDI(resolve(root, "petaFiles"));

  useConfigSecureFilePassword().setKey(key);
  await initDB();
}
