import { rm, stat } from "fs/promises";
import * as Path from "path";

import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
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
import { generatePetaFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { useDBPetaFiles, useDBPetaFilesPetaTags } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { fileSHA256 } from "@/main/utils/fileSHA256";
import { getPetaFileDirectoryPath, getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
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
      {},
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
  async getPetaFileIds(params: GetPetaFileIdsParams) {
    const dbPetaFiles = useDBPetaFiles();
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    // all
    if (params.type === "all") {
      const ids = dbPetaFiles.getAll().map((pi) => pi.id);
      return ids;
    }
    // untagged
    if (params.type === "untagged") {
      const taggedIds = Array.from(
        new Set(
          dbPetaFilesPetaTags.getAll().map((pipt) => {
            return pipt.petaFileId;
          }),
        ),
      );
      const ids = (
        await dbPetaFiles.find({
          id: {
            $nin: taggedIds,
          },
        })
      ).map((pi) => pi.id);
      return ids;
    }
    // filter by ids
    if (params.type === "petaTag") {
      const pipts = await dbPetaFilesPetaTags.find({
        $or: params.petaTagIds.map((id) => {
          return {
            petaTagId: id,
          };
        }),
      });
      const ids = Array.from(
        new Set(
          pipts.map((pipt) => {
            return pipt.petaFileId;
          }),
        ),
      ).filter((id) => {
        return (
          pipts.filter((pipt) => {
            return pipt.petaFileId === id;
          }).length === params.petaTagIds.length
        );
      });
      return ids;
    }
    return [];
  }
  private async update(petaFile: PetaFile, mode: UpdateMode) {
    const dbPetaFiles = useDBPetaFiles();
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.log("##Update PetaFile");
    log.log("mode:", mode);
    log.log("image:", minimizeID(petaFile.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaFilesPetaTags.remove({ petaFileId: petaFile.id });
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
        log.log("## Import Images From File Paths");
        const fileInfos: ImportFileInfo[] = [];
        if (params.extract) {
          log.log("###List Files", params.fileInfos.length);
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
          log.log("complete", fileInfos.length);
        } else {
          fileInfos.push(...params.fileInfos);
        }
        let addedFileCount = 0;
        let processedFileCount = 0;
        let error = false;
        const petaFiles: PetaFile[] = [];
        const importImage = async (fileInfo: ImportFileInfo, index: number) => {
          log.log("import:", index + 1, "/", fileInfos.length);
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
              const directory = getPetaFileDirectoryPath.fromID(id);
              const petaFile = await generatePetaFile({
                path: fileInfo.path,
                dirOriginals: directory.original,
                dirThumbnails: directory.thumbnail,
                extends: {
                  name: fileInfo.name ?? name,
                  fileDate: fileDate.getTime(),
                  note: fileInfo.note,
                  id,
                },
                type: "add",
              });
              if (petaFile === undefined) {
                throw new Error("unsupported file");
              }
              await this.updateMultiple([petaFile], UpdateMode.INSERT, true);
              addedFileCount++;
              petaFiles.push(petaFile);
            }
            log.log("imported", result);
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
        log.log("return:", addedFileCount, "/", fileInfos.length);
        handler.emitStatus({
          i18nKey: "tasks.importingFiles",
          log: [addedFileCount.toString(), fileInfos.length.toString()],
          status: error ? TaskStatusCode.FAILED : TaskStatusCode.COMPLETE,
        });
        return petaFiles;
      },
      {},
      silent,
    );
  }
  async regenerateMetadatas() {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regenerateMetadatasBegin");
    const petaFiles = Object.values(await this.getAll());
    let completed = 0;
    const generate = async (petaFile: PetaFile) => {
      const directory = getPetaFileDirectoryPath.fromPetaFile(petaFile);
      const newPetaFile = await generatePetaFile({
        path: getPetaFilePath.fromPetaFile(petaFile).original,
        type: "update",
        dirOriginals: directory.original,
        dirThumbnails: directory.thumbnail,
        extends: petaFile,
      });
      if (newPetaFile === undefined) {
        return;
      }
      await this.update(newPetaFile, UpdateMode.UPDATE);
      log.log(`thumbnail (${++completed} / ${petaFiles.length})`);
      windows.emitMainEvent(
        { type: EmitMainEventTargetType.ALL },
        "regenerateMetadatasProgress",
        completed,
        petaFiles.length,
      );
    };
    await ppa((pf) => generate(pf), petaFiles, CPU_LENGTH).promise;
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regenerateMetadatasComplete");
  }
}
export const petaFilesControllerKey = createKey<PetaFilesController>("petaFilesController");
export const usePetaFilesController = createUseFunction(petaFilesControllerKey);
