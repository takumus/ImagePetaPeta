import { rename, rm, stat } from "fs/promises";
import * as Path from "path";
import { fileTypeFromStream } from "file-type";
import { v4 as uuid } from "uuid";

import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { ImportImageResult } from "@/commons/datas/importImageResult";
import { PetaFile, PetaFiles } from "@/commons/datas/petaFile";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as file from "@/main/libs/file";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import {
  generatePetaFile,
  regeneratePetaFile,
} from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBPetaFiles } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { fileSHA256 } from "@/main/utils/fileSHA256";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile, secureFile } from "@/main/utils/secureFile";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export class PetaFilesController {
  public async updateMultiple(datas: PetaFile[], mode: UpdateMode, silent = false) {
    const tasks = useTasks();
    const windows = useWindows();
    return tasks.spawn(
      "UpdatePetaFiles",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: TaskStatusCode.BEGIN,
        });
        const update = async (data: PetaFile, index: number) => {
          await this.update(data, mode);
          handler.emitStatus({
            i18nKey: "tasks.updateDatas",
            progress: {
              all: datas.length,
              current: index + 1,
            },
            log: [data.id],
            status: TaskStatusCode.PROGRESS,
          });
        };
        await ppa(update, datas).promise;
        if (mode === UpdateMode.REMOVE) {
          // Tileの更新対象なし
          windows.emitMainEvent(
            {
              type: EmitMainEventTargetType.WINDOW_NAMES,
              windowNames: ["board", "browser", "details"],
            },
            "updatePetaTags",
            {
              petaFileIds: [],
              petaTagIds: [],
            },
          );
        }
        windows.emitMainEvent(
          {
            type: EmitMainEventTargetType.WINDOW_NAMES,
            windowNames: ["board", "browser", "details"],
          },
          "updatePetaFiles",
          datas,
          mode,
        );
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: TaskStatusCode.COMPLETE,
        });
      },
      silent,
    );
  }
  async getPetaFile(id: string) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFile = (await dbPetaFiles.find({ id }))[0];
    if (petaFile === undefined) {
      return undefined;
    }
    return petaFile;
  }
  async getAll() {
    const dbPetaFiles = useDBPetaFiles();
    const data = dbPetaFiles.getAll();
    const petaFiles: PetaFiles = {};
    data.forEach((pi) => {
      petaFiles[pi.id] = pi;
    });
    return petaFiles;
  }
  private async update(petaFile: PetaFile, mode: UpdateMode) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("##Update PetaFile");
    log.debug("mode:", mode);
    log.debug("image:", minimizeID(petaFile.id));
    if (mode === UpdateMode.REMOVE) {
      await petaFilesPetaTagsController.remove(petaFile.id, "petaFileId");
      await dbPetaFiles.remove({ id: petaFile.id });
      const path = getPetaFilePath.fromPetaFile(petaFile);
      await rm(path.original).catch(() => {
        //
      });
      await rm(path.thumbnail).catch(() => {
        //
      });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaFiles.update({ id: petaFile.id }, petaFile);
    } else {
      await dbPetaFiles.insert(petaFile);
    }
    return true;
  }
  async importFilesFromFileInfos(
    params: {
      fileInfos: ImportFileInfo[];
      extract?: boolean;
    },
    silent = false,
  ) {
    const logger = useLogger();
    const tasks = useTasks();
    if (params.fileInfos.length === 0) {
      return [];
    }
    return tasks.spawn(
      "importFilesFromFilePaths",
      async (handler) => {
        const log = logger.logMainChunk();
        log.debug("## Import Images From File Paths");
        const fileInfos: ImportFileInfo[] = [];
        if (params.extract) {
          log.debug("###List Files", params.fileInfos.length);
          handler.emitStatus({
            i18nKey: "tasks.listingFiles",
            status: TaskStatusCode.BEGIN,
            log: [],
            cancelable: true,
          });
          try {
            for (let i = 0; i < params.fileInfos.length; i++) {
              const fileInfo = params.fileInfos[i];
              if (!fileInfo) continue;
              const readDirResult = file.readDirRecursive(fileInfo.path);
              handler.onCancel = readDirResult.cancel;
              fileInfos.push(
                ...(await readDirResult.files).map((path) => ({
                  path,
                  note: fileInfo.note,
                  name: fileInfo.name,
                })),
              );
            }
          } catch (error) {
            handler.emitStatus({
              i18nKey: "tasks.listingFiles",
              status: TaskStatusCode.FAILED,
              log: [],
              cancelable: true,
            });
            return [];
          }
          log.debug("complete", fileInfos.length);
        } else {
          fileInfos.push(...params.fileInfos);
        }
        let addedFileCount = 0;
        let processedFileCount = 0;
        let error = false;
        const petaFiles: PetaFile[] = [];
        const importImage = async (fileInfo: ImportFileInfo, index: number) => {
          log.debug("import:", index + 1, "/", fileInfos.length);
          let result = ImportImageResult.SUCCESS;
          let errorReason = "";
          try {
            const name = Path.basename(fileInfo.path);
            const fileDate = (await stat(fileInfo.path)).mtime;
            if (!(await isSupportedFile(fileInfo.path))) {
              throw new Error("unsupported file");
            }
            const id = await fileSHA256(fileInfo.path);
            const exists = await this.getPetaFile(id);
            if (exists !== undefined) {
              result = ImportImageResult.EXISTS;
              petaFiles.push(exists);
            } else {
              const petaFile = await generatePetaFile({
                filePath: fileInfo.path,
                extends: {
                  name: fileInfo.name ?? name,
                  fileDate: fileDate.getTime(),
                  note: fileInfo.note,
                  id,
                },
                type: "add",
                encrypt: true,
              });
              if (petaFile === undefined) {
                throw new Error("unsupported file");
              }
              await this.updateMultiple([petaFile], UpdateMode.INSERT, true);
              addedFileCount++;
              petaFiles.push(petaFile);
            }
            log.debug("imported", result);
          } catch (err) {
            log.error(err);
            errorReason = String(err);
            result = ImportImageResult.ERROR;
            error = true;
          }
          processedFileCount++;
          handler.emitStatus({
            i18nKey: "tasks.importingFiles",
            progress: {
              all: fileInfos.length,
              current: processedFileCount,
            },
            log: [result, `${errorReason !== "" ? `(${errorReason})` : ""}${fileInfo.path}`],
            status: TaskStatusCode.PROGRESS,
            cancelable: true,
          });
        };
        const result = ppa(importImage, fileInfos, CPU_LENGTH);
        handler.onCancel = result.cancel;
        try {
          await result.promise;
        } catch (err) {
          //
        }
        log.debug("return:", addedFileCount, "/", fileInfos.length);
        handler.emitStatus({
          i18nKey: "tasks.importingFiles",
          log: [addedFileCount.toString(), fileInfos.length.toString()],
          status: error ? TaskStatusCode.FAILED : TaskStatusCode.COMPLETE,
        });
        return petaFiles;
      },
      silent,
    );
  }
  async regeneratePetaFiles() {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regeneratePetaFilesBegin");
    const petaFiles = Object.values(await this.getAll());
    let completed = 0;
    const generate = async (petaFile: PetaFile) => {
      const newPetaFile = await regeneratePetaFile(petaFile);
      if (newPetaFile === undefined) {
        return;
      }
      await this.update(newPetaFile, UpdateMode.UPDATE);
      log.debug(`thumbnail (${++completed} / ${petaFiles.length})`);
      windows.emitMainEvent(
        { type: EmitMainEventTargetType.ALL },
        "regeneratePetaFilesProgress",
        completed,
        petaFiles.length,
      );
    };
    await ppa((pf) => generate(pf), petaFiles, CPU_LENGTH).promise;
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regeneratePetaFilesComplete");
  }
  async verifyFiles() {
    const petaFiles = Object.values(await this.getAll());
    usePetaFilesPetaTagsController();
    let brokenPetaTag = (await usePetaTagsController().getPetaTags()).find(
      (p) => p.name === "broken",
    );
    if (brokenPetaTag === undefined) {
      await usePetaTagsController().updateMultiple(
        [
          {
            type: "name",
            name: "broken",
          },
        ],
        UpdateMode.INSERT,
      );
      brokenPetaTag = (await usePetaTagsController().getPetaTags()).find(
        (p) => p.name === "broken",
      );
    }
    if (brokenPetaTag === undefined) {
      return;
    }
    console.log(brokenPetaTag);
    (await usePetaTagsController().getPetaTags()).find((p) => p.name === "broken");
    const errorIDs: string[] = [];
    let count = 0;
    const verify = async (petaFile: PetaFile) => {
      try {
        const paths = getPetaFilePath.fromPetaFile(petaFile);
        const statOrg = await stat(paths.original);
        const statThumb = await stat(paths.original);
        const type = await fileTypeFromStream(getStreamFromPetaFile(petaFile, "original"));
        if (type?.mime !== petaFile.metadata.mimeType) {
          errorIDs.push(petaFile.id);
        }
      } catch (err) {
        errorIDs.push(petaFile.id);
      }
      console.log(++count, "/", petaFiles.length);
    };
    await ppa((pf) => verify(pf), petaFiles, CPU_LENGTH).promise;
    await usePetaFilesPetaTagsController().updatePetaFilesPetaTags(
      errorIDs,
      [{ type: "id", id: brokenPetaTag.id }],
      UpdateMode.INSERT,
      true,
    );
    console.log("error:", errorIDs.length, "/", petaFiles.length);
  }
  async encryptAll(mode: keyof typeof secureFile) {
    const petaFiles = Object.values(await this.getAll());
    const key = useConfigSecureFilePassword().getValue();
    await ppa(
      async (pf, i) => {
        const pathOrg = getPetaFilePath.fromPetaFile(pf);
        const pathTemp = {
          original: Path.resolve(usePaths().DIR_TEMP, uuid()),
          thumbnail: Path.resolve(usePaths().DIR_TEMP, uuid()),
        };
        try {
          let k: keyof typeof pathOrg;
          for (k in pathOrg) {
            await secureFile[mode].toFile(pathOrg[k], pathTemp[k], key);
            await rename(pathTemp[k], pathOrg[k]);
          }
          pf.encrypted = mode === "encrypt";
          this.update(pf, UpdateMode.UPDATE);
        } catch (e) {
          console.log(e);
        }
        console.log(pf.id, i);
      },
      petaFiles.filter(
        (pf) => (mode === "encrypt" && !pf.encrypted) || (mode === "decrypt" && pf.encrypted),
      ),
      CPU_LENGTH,
    ).promise;
    console.log("complete");
  }
}
export const petaFilesControllerKey = createKey<PetaFilesController>("petaFilesController");
export const usePetaFilesController = createUseFunction(petaFilesControllerKey);
