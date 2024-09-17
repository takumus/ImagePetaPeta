import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { ObjectKeys } from "@/commons/utils/objectKeys";

import { extraFiles } from "@/_defines/extraFiles";
import { createWorkerThreadsGroup } from "@/main/libs/workerThreadsGroup";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { usePaths } from "@/main/provides/utils/paths";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";

const workerGroup = createWorkerThreadsGroup(import("@/main/provides/tf/!workerThreads.tf"));
export const tfByWorker = (() => {
  const callbacks: { [id: number]: Parameters<typeof worker.on<"message">>[1] } = {};
  let _id = 0;
  function createWorker() {
    const w = workerGroup.get();
    w.use();
    w.on("message", async (data) => {
      callbacks[data.id](data);
    });
    return w;
  }
  function init() {
    const tfModelPaths: { [key: string]: string } = ObjectKeys(
      extraFiles["mobilenet.universal"],
    ).reduce<{ [key: string]: string }>((acc, key) => {
      acc[key] = resolveExtraFilesPath(extraFiles["mobilenet.universal"][key]);
      return acc;
    }, {});
    const id = _id++;
    if (worker.destroyed) {
      worker = createWorker();
    }
    return new Promise<boolean>((res, rej) => {
      worker.postMessage({
        method: "init",
        id,
        args: {
          paths: usePaths(),
          tfModelPaths,
          secureKey: useConfigSecureFilePassword().getKey(),
        },
      });
      callbacks[id] = (data) => {
        if (data.method === "init") {
          res(data.result);
        }
      };
    });
  }
  let worker = createWorker();
  return {
    init,
    getSimilarPetaFileIDsByPetaFile: async (basePetaFile: PetaFile, allPetaFiles: PetaFile[]) => {
      await init();
      return new Promise<
        {
          id: string;
          score: number;
        }[]
      >((res, rej) => {
        const id = _id++;
        worker.postMessage({
          method: "getSimilarPetaFileIDsByPetaFile",
          id,
          args: {
            basePetaFile,
            allPetaFiles,
          },
        });
        callbacks[id] = (data) => {
          if (data.method === "getSimilarPetaFileIDsByPetaFile") {
            res(data.result);
          }
        };
      });
    },
    getSimilarPetaTags: async (
      petaFile: PetaFile,
      allPetaFiles: PetaFile[],
      allPetaTags: PetaTag[],
      allPIPTs: PetaFilePetaTag[],
    ) => {
      await init();
      return new Promise<
        {
          tagId: string;
          prob: number;
          name: string | undefined;
        }[]
      >((res, rej) => {
        const id = _id++;
        worker.postMessage({
          method: "getSimilarPetaTags",
          id,
          args: {
            petaFile,
            allPetaFiles,
            allPetaTags,
            allPIPTs,
          },
        });
        callbacks[id] = (data) => {
          if (data.method === "getSimilarPetaTags") {
            res(data.result);
          }
        };
      });
    },
  };
})();
