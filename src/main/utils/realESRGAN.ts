import * as fs from "node:fs/promises";
import * as Path from "node:path";

import { PetaFile } from "@/commons/datas/petaFile";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { ppa } from "@/commons/utils/pp";

import { extraFiles } from "@/_defines/extraFiles";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { useDBPetaFilesPetaTags } from "@/main/provides/databases";
import { useFileImporter } from "@/main/provides/fileImporter";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { useAppPaths, useLibraryPaths } from "@/main/provides/utils/paths";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { runExternalApplication } from "@/main/utils/runExternalApplication";

export async function realESRGAN(petaFiles: PetaFile[], modelName: RealESRGANModelName) {
  const appPaths = useAppPaths();
  const tasks = useTasks();
  const task = tasks.spawn("realESRGAN", false);
  const log = useLogger().logChunk("realESRGAN");
  const { execFilePath, modelFilePath } = getFilePath();
  log.debug("execFilePath:", execFilePath);
  await setPermisionTo755(execFilePath);
  let success = true;
  const newPetaFiles: PetaFile[] = [];
  task.emitStatus({
    i18nKey: "tasks.upconverting",
    log: [petaFiles.length.toString()],
    status: "begin",
    cancelable: true,
  });
  const processes = ppa(
    async (petaFile, index) => {
      const inputFile = getPetaFilePath.fromPetaFile(petaFile).original;
      const outputFile = `${Path.resolve(appPaths.DIR_TEMP, petaFile.id)}.png`;
      const parameters = ["-i", inputFile, "-o", outputFile, "-m", modelFilePath, "-n", modelName];
      let percent = 0;
      const childProcess = runExternalApplication(execFilePath, parameters, "utf8", (l) => {
        l = l.trim();
        percent = /^\d+\.\d+%$/.test(l) ? Number(l.replace(/%/, "")) : percent;
        log.debug(l);
        task.emitStatus({
          i18nKey: "tasks.upconverting",
          progress: {
            all: petaFiles.length,
            current: index + percent / 100,
          },
          log: [l],
          status: "progress",
          cancelable: true,
        });
      });
      task.onCancel = () => {
        childProcess.kill();
        processes.cancel();
      };
      task.emitStatus({
        i18nKey: "tasks.upconverting",
        progress: {
          all: petaFiles.length,
          current: index,
        },
        log: [[execFilePath, ...parameters].join(" ")],
        status: "progress",
        cancelable: true,
      });
      const result = await childProcess.promise;
      if (result) {
        const newPetaFile = await importImage(
          outputFile,
          petaFile,
          `${petaFile.name}(RealESRGAN-${modelName})`,
        );
        if (newPetaFile !== undefined) {
          success = true;
          newPetaFiles.push(newPetaFile);
        }
      } else {
        success = false;
      }
    },
    petaFiles,
    1,
  );
  await processes.promise;
  task.emitStatus({
    i18nKey: "tasks.upconverting",
    log: [],
    status: success ? "complete" : "failed",
  });
  return newPetaFiles;
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

async function setPermisionTo755(execFilePath: string) {
  if (process.platform === "darwin") {
    try {
      await fs.access(execFilePath, fs.constants.X_OK);
    } catch {
      await fs.chmod(execFilePath, "755");
    }
  }
}

async function importImage(outputFile: string, petaFile: PetaFile, newName: string) {
  const petaFilesController = usePetaFilesController();
  const fileImporter = useFileImporter();
  const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
  const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
  const newPetaFiles = await fileImporter.importFilesFromFileInfos({
    fileInfos: [{ path: outputFile }],
  });
  if (newPetaFiles.length < 1) {
    return undefined;
  }
  const newPetaFile = newPetaFiles[0];
  if (!newPetaFile) {
    return undefined;
  }
  newPetaFile.addDate = petaFile.addDate + 1;
  newPetaFile.fileDate = petaFile.fileDate;
  newPetaFile.name = newName;
  newPetaFile.note = petaFile.note;
  newPetaFile.nsfw = petaFile.nsfw;
  await petaFilesController.updateMultiple([newPetaFile], "update");
  const pipts = await dbPetaFilesPetaTags.find({
    petaFileId: petaFile.id,
  });
  await petaFilesPetaTagsController.updatePetaFilesPetaTags(
    [newPetaFile.id],
    pipts.map((pipt) => ({
      type: "id",
      id: pipt.petaTagId,
    })),
    "insert",
  );
  return newPetaFile;
}
