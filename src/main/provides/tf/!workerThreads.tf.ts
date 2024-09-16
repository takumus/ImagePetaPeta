import { FileTypeResult } from "file-type";
import sharp from "sharp";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  FILENAME_SECURE_FILE_PASSWORD,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { provide } from "@/main/libs/di";
import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { configSecureFilePasswordKey } from "@/main/provides/configs";
import { ConfigSecureFilePassword } from "@/main/provides/configs/secureFilePassword";
import { getSimplePalette } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo/generatePalette";
import { TF } from "@/main/provides/tf";
import { Paths, pathsKey, usePaths } from "@/main/provides/utils/paths";

type ToWorker =
  | {
      method: "init";
      args: { paths: Paths; mnPaths: { [key: string]: string }; secureKey: string };
    }
  | {
      method: "getSimilarPetaFileIDsByPetaFile";
      args: {
        basePetaFile: PetaFile;
        allPetaFiles: PetaFile[];
      };
    }
  | {
      method: "getSimilarPetaTags";
      args: {
        petaFile: PetaFile;
        allPetaFiles: PetaFile[];
        allPetaTags: PetaTag[];
        allPIPTs: PetaFilePetaTag[];
      };
    };
type ToMain =
  | { method: "init"; result: boolean }
  | {
      method: "getSimilarPetaFileIDsByPetaFile";
      result: {
        id: string;
        score: number;
      }[];
    }
  | {
      method: "getSimilarPetaTags";
      result: {
        tagId: string;
        prob: number;
        name: string | undefined;
      }[];
    };
export default initWorkerThreads<ToWorker, ToMain>((port) => {
  let tf: TF | undefined;
  port.on("message", async (params) => {
    console.log(params);
    if (params.method === "init") {
      if (tf !== undefined) {
        port.postMessage({ method: "init", result: true });
        return;
      }
      provide(pathsKey, params.args.paths);
      provide(configSecureFilePasswordKey, {
        getKey() {
          return params.args.secureKey;
        },
      } as any);
      tf = new TF();
      await tf.init(params.args.mnPaths);
      port.postMessage({ method: "init", result: true });
    } else if (params.method === "getSimilarPetaFileIDsByPetaFile") {
      const result =
        (await tf?.getSimilarPetaFileIDsByPetaFile(
          params.args.basePetaFile,
          params.args.allPetaFiles,
        )) ?? [];
      port.postMessage({ method: "getSimilarPetaFileIDsByPetaFile", result });
    } else if (params.method === "getSimilarPetaTags") {
      const result =
        (await tf?.getSimilarPetaTags(
          params.args.petaFile,
          params.args.allPetaFiles,
          params.args.allPetaTags,
          params.args.allPIPTs,
        )) ?? [];
      port.postMessage({ method: "getSimilarPetaTags", result });
    }
  });
});
