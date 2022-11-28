import axios, { AxiosError } from "axios";
import dataUriToBuffer from "data-uri-to-buffer";
import * as Path from "path";
import { v4 as uuid } from "uuid";

import { FileType } from "@/commons/datas/fileType";
import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { ImportImageResult } from "@/commons/datas/importImageResult";
import { PetaFile, PetaFiles } from "@/commons/datas/petaFile";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowType } from "@/commons/datas/windowType";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as file from "@/main/libs/file";
import * as Tasks from "@/main/libs/task";
import { generatePetaFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { useDBPetaFiles, useDBPetaFilesPetaTags } from "@/main/provides/databases";
import { fileSHA256 } from "@/main/provides/utils/fileSHA256";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { EmitMainEventTargetType } from "@/main/provides/windows";
import { emitMainEvent } from "@/main/utils/emitMainEvent";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export class PetaFilesController {
  public async updateMultiple(datas: PetaFile[], mode: UpdateMode, silent = false) {
    return Tasks.spawn(
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
          emitMainEvent(
            {
              type: EmitMainEventTargetType.WINDOW_TYPES,
              windowTypes: [WindowType.BOARD, WindowType.BROWSER, WindowType.DETAILS],
            },
            "updatePetaTags",
            {
              petaFileIds: [],
              petaTagIds: [],
            },
          );
        }
        emitMainEvent(
          {
            type: EmitMainEventTargetType.WINDOW_TYPES,
            windowTypes: [WindowType.BOARD, WindowType.BROWSER, WindowType.DETAILS],
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
  getFilePath(petaFile: PetaFile, thumbnail: FileType) {
    const paths = usePaths();
    if (thumbnail === FileType.ORIGINAL) {
      return Path.resolve(paths.DIR_IMAGES, petaFile.file.original);
    } else {
      return Path.resolve(paths.DIR_THUMBNAILS, petaFile.file.thumbnail);
    }
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
      await file.rm(this.getFilePath(petaFile, FileType.ORIGINAL)).catch(() => {
        //
      });
      await file.rm(this.getFilePath(petaFile, FileType.THUMBNAIL)).catch(() => {
        //
      });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaFiles.update({ id: petaFile.id }, petaFile);
    } else {
      await dbPetaFiles.insert(petaFile);
    }
    return true;
  }
  async createFileInfoFromURL(url: string) {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.log("## Create File Info URL");
      let data: Buffer;
      let remoteURL = "";
      if (url.trim().startsWith("data:")) {
        // dataURIだったら
        data = dataUriToBuffer(url);
      } else {
        // 普通のurlだったら
        data = (await axios.get(url, { responseType: "arraybuffer" })).data;
        remoteURL = url;
      }
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await file.writeFile(dist, data);
      log.log("return:", true);
      return {
        path: dist,
        note: remoteURL,
        name: "downloaded",
      } as ImportFileInfo;
    } catch (error) {
      if (error instanceof AxiosError) {
        log.error(error.message, error.code);
      } else {
        log.error(error);
      }
    }
    log.log("return:", false);
    return undefined;
  }
  async createFileInfoFromBuffer(buffer: ArrayBuffer | Buffer) {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.log("## Create File Info From ArrayBuffer");
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await file.writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
      log.log("return:", true);
      return {
        path: dist,
        note: "",
        name: "noname",
      } as ImportFileInfo;
    } catch (error) {
      log.error(error);
    }
    log.log("return:", false);
    return undefined;
  }
  async importFilesFromFileInfos(
    params: {
      fileInfos: ImportFileInfo[];
      extract?: boolean;
    },
    silent = false,
  ) {
    const logger = useLogger();
    const paths = usePaths();
    if (params.fileInfos.length == 0) {
      return [];
    }
    return Tasks.spawn(
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
            const fileDate = (await file.stat(fileInfo.path)).mtime;
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
                path: fileInfo.path,
                dirOriginals: paths.DIR_IMAGES,
                dirThumbnails: paths.DIR_THUMBNAILS,
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
    const paths = usePaths();
    const log = logger.logMainChunk();
    emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regenerateMetadatasBegin");
    const petaFiles = Object.values(await this.getAll());
    let completed = 0;
    const generate = async (petaFile: PetaFile) => {
      const newPetaFile = await generatePetaFile({
        path: Path.resolve(paths.DIR_IMAGES, petaFile.file.original),
        type: "update",
        dirOriginals: paths.DIR_IMAGES,
        dirThumbnails: paths.DIR_THUMBNAILS,
        extends: petaFile,
      });
      if (newPetaFile === undefined) {
        return;
      }
      await this.update(newPetaFile, UpdateMode.UPDATE);
      log.log(`thumbnail (${++completed} / ${petaFiles.length})`);
      emitMainEvent(
        { type: EmitMainEventTargetType.ALL },
        "regenerateMetadatasProgress",
        completed,
        petaFiles.length,
      );
    };
    await ppa((pf) => generate(pf), petaFiles, CPU_LENGTH).promise;
    emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regenerateMetadatasComplete");
  }
}
export const petaFilesControllerKey = createKey<PetaFilesController>("petaFilesController");
export const usePetaFilesController = createUseFunction(petaFilesControllerKey);
