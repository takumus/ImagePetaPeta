import * as fs from "fs";
import * as Path from "path";

import { FileType } from "@/commons/datas/imageType";
import { PetaFile } from "@/commons/datas/petaFile";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { ppa } from "@/commons/utils/pp";

import { extraFiles } from "@/@assets/extraFiles";
import * as Tasks from "@/main/libs/task";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBPetaFilesPetaTags } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { runExternalApplication } from "@/main/utils/runExternalApplication";

export async function realESRGAN(petaFiles: PetaFile[], modelName: RealESRGANModelName) {
  const petaFilesController = usePetaFilesController();
  const paths = usePaths();
  const logger = useLogger();
  return Tasks.spawn(
    "realESRGAN",
    async (handler) => {
      const log = logger.logMainChunk();
      const { execFilePath, modelFilePath } = getFilePath();
      setPermisionTo755(execFilePath);
      let success = true;
      handler.emitStatus({
        i18nKey: "tasks.upconverting",
        log: [petaFiles.length.toString()],
        status: TaskStatusCode.BEGIN,
        cancelable: true,
      });
      log.log("execFilePath:", execFilePath);
      const tasks = ppa(
        async (petaFile, index) => {
          const inputFile = petaFilesController.getFilePath(petaFile, FileType.ORIGINAL);
          const outputFile = `${Path.resolve(paths.DIR_TEMP, petaFile.id)}.webp`;
          const parameters = [
            "-i",
            inputFile,
            "-o",
            outputFile,
            "-m",
            modelFilePath,
            "-n",
            modelName,
          ];
          let percent = 0;
          const childProcess = runExternalApplication(execFilePath, parameters, "utf8", (l) => {
            l = l.trim();
            percent = /^\d+\.\d+%$/.test(l) ? Number(l.replace(/%/, "")) : percent;
            log.log(l);
            handler.emitStatus({
              i18nKey: "tasks.upconverting",
              progress: {
                all: petaFiles.length,
                current: index + percent / 100,
              },
              log: [l],
              status: TaskStatusCode.PROGRESS,
              cancelable: true,
            });
          });
          handler.onCancel = () => {
            childProcess.kill();
            tasks.cancel();
          };
          handler.emitStatus({
            i18nKey: "tasks.upconverting",
            progress: {
              all: petaFiles.length,
              current: index,
            },
            log: [[execFilePath, ...parameters].join(" ")],
            status: TaskStatusCode.PROGRESS,
            cancelable: true,
          });
          const result = await childProcess.promise;
          if (result) {
            success = await importImage(
              outputFile,
              petaFile,
              `${petaFile.name}(RealESRGAN-${modelName})`,
            );
          } else {
            success = false;
          }
        },
        petaFiles,
        1,
      );
      await tasks.promise;
      handler.emitStatus({
        i18nKey: "tasks.upconverting",
        log: [],
        status: success ? TaskStatusCode.COMPLETE : TaskStatusCode.FAILED,
      });
      return success;
    },
    {},
    false,
  );
}
function getFilePath() {
  const isMac = process.platform === "darwin";
  const execFilePath = resolveExtraFilesPath(
    isMac
      ? extraFiles["realesrgan.darwin"]["realesrgan-ncnn-vulkan"]
      : extraFiles["realesrgan.win32"]["realesrgan-ncnn-vulkan.exe"],
  );
  const modelFilePath = resolveExtraFilesPath(
    isMac ? extraFiles["realesrgan.darwin"]["models/"] : extraFiles["realesrgan.win32"]["models/"],
  );
  return { execFilePath, modelFilePath };
}

function setPermisionTo755(execFilePath: string) {
  if (process.platform === "darwin") {
    try {
      fs.accessSync(execFilePath, fs.constants.X_OK);
    } catch {
      fs.chmodSync(execFilePath, "755");
    }
  }
}

async function importImage(outputFile: string, petaFile: PetaFile, newName: string) {
  const petaFilesController = usePetaFilesController();
  const petaTagsController = usePetaTagsController();
  const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
  const newPetaFiles = await petaFilesController.importFilesFromFileInfos({
    fileInfos: [{ path: outputFile }],
  });
  if (newPetaFiles.length < 1) {
    return false;
  }
  const newPetaFile = newPetaFiles[0];
  if (!newPetaFile) {
    return false;
  }
  newPetaFile.addDate = petaFile.addDate + 1;
  newPetaFile.fileDate = petaFile.fileDate;
  newPetaFile.name = newName;
  newPetaFile.note = petaFile.note;
  newPetaFile.nsfw = petaFile.nsfw;
  await petaFilesController.updateMultiple([newPetaFile], UpdateMode.UPDATE);
  const pipts = await dbPetaFilesPetaTags.find({
    petaFileId: petaFile.id,
  });
  await petaTagsController.updatePetaFilesPetaTags(
    [newPetaFile.id],
    pipts.map((pipt) => ({
      type: "id",
      id: pipt.petaTagId,
    })),
    UpdateMode.INSERT,
  );
  return true;
}
