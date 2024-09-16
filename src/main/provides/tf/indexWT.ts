import { get } from "http";

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
export const tfByWorker1 = workerGroup.createUseWorkerThreadFunction((params) => {
  return new Promise((res, rej) => {
    const worker = workerGroup.get();
    worker.use();
    worker.postMessage(params);
    worker.once("error", (err) => {
      rej(err);
      worker.unuse();
    });
    worker.once("message", async (data) => {
      try {
        res(data);
      } catch (err) {
        rej(err);
      }
      worker.unuse();
    });
  });
});
export const tfByWorker = (() => {
  const worker = workerGroup.get();
  worker.use();
  return {
    init: () => {
      const mnPaths: { [key: string]: string } = ObjectKeys(
        extraFiles["mobilenet.universal"],
      ).reduce<{ [key: string]: string }>((acc, key) => {
        acc[key] = resolveExtraFilesPath(extraFiles["mobilenet.universal"][key]);
        return acc;
      }, {});
      console.log("TF:", "mnPaths", mnPaths);
      return new Promise<boolean>((res, rej) => {
        worker.postMessage({
          method: "init",
          args: {
            paths: usePaths(),
            mnPaths,
            secureKey: useConfigSecureFilePassword().getKey(),
          },
        });
        worker.once("message", async (data) => {
          console.log(data);
          try {
            res(data.result as any);
          } catch (err) {
            rej(err);
          }
        });
      });
    },
    getSimilarPetaFileIDsByPetaFile: (basePetaFile: PetaFile, allPetaFiles: PetaFile[]) => {
      return new Promise<
        {
          id: string;
          score: number;
        }[]
      >((res, rej) => {
        worker.postMessage({
          method: "getSimilarPetaFileIDsByPetaFile",
          args: {
            basePetaFile,
            allPetaFiles,
          },
        });
        worker.once("message", async (data) => {
          try {
            res(data.result as any);
          } catch (err) {
            rej(err);
          }
        });
      });
    },
    getSimilarPetaTags: async (
      petaFile: PetaFile,
      allPetaFiles: PetaFile[],
      allPetaTags: PetaTag[],
      allPIPTs: PetaFilePetaTag[],
    ) => {
      return new Promise<
        {
          tagId: string;
          prob: number;
          name: string | undefined;
        }[]
      >((res, rej) => {
        worker.postMessage({
          method: "getSimilarPetaTags",
          args: {
            petaFile,
            allPetaFiles,
            allPetaTags,
            allPIPTs,
          },
        });
        worker.once("message", async (data) => {
          try {
            res(data.result as any);
          } catch (err) {
            rej(err);
          }
        });
      });
    },
  };
})();
