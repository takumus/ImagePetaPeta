import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { dialog } from "electron";

import { ImportFileGroup } from "@/commons/datas/importFileGroup";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { ImportImageResult } from "@/commons/datas/importImageResult";
import { LogChunk } from "@/commons/datas/logChunk";
import { PetaFile } from "@/commons/datas/petaFile";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { getIdsFromFilePaths } from "@/commons/utils/getIdsFromFilePaths";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as file from "@/main/libs/file";
import { createFileInfo } from "@/main/provides/controllers/petaFilesController/createFileInfo";
import { generatePetaFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { TaskHandler, useTasks } from "@/main/provides/tasks";
import { useSecureTempFileKey } from "@/main/provides/tempFileKey";
import { useLogger } from "@/main/provides/utils/logger";
import { useWindows } from "@/main/provides/windows";
import { fileSHA256 } from "@/main/utils/fileSHA256";
import { secureFile } from "@/main/utils/secureFile";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export class FileImporter {
  public async browseFiles(event: Electron.IpcMainInvokeEvent, type: "files" | "directories") {
    const windows = useWindows();
    const fileImporter = useFileImporter();
    const windowInfo = windows.getWindowByEvent(event);
    if (windowInfo) {
      const result = await dialog.showOpenDialog(windowInfo.window, {
        properties: type === "files" ? ["openFile", "multiSelections"] : ["openDirectory"],
      });
      fileImporter.importFilesFromFileInfos({
        fileInfos: result.filePaths.map((path) => ({ path })),
        extract: true,
      });
      return result.filePaths.length;
    }
    return 0;
  }
  public async importFilesFromImportFileGroup(datas: ImportFileGroup[]) {
    const logFromBrowser = useLogger().logMainChunk();
    const ids = getIdsFromFilePaths(datas);
    logFromBrowser.debug("## From Browser");
    if (ids.length > 0 && ids.length === datas.length) {
      logFromBrowser.debug("return:", ids.length);
      return ids;
    } else {
      logFromBrowser.debug("return:", false);
    }
    const fileInfos = (
      await ppa(async (group): Promise<ImportFileInfo | undefined> => {
        for (let i = 0; i < group.length; i++) {
          try {
            const d = group[i];
            switch (d.type) {
              case "filePath":
                return {
                  path: d.filePath,
                  ...d.additionalData,
                };
              case "url":
              case "buffer": {
                const result =
                  d.type === "url"
                    ? await createFileInfo.fromURL(d.url, d.referrer, d.ua)
                    : await createFileInfo.fromBuffer(d.buffer);
                if (result !== undefined) {
                  result.name = d.additionalData?.name ?? result.name;
                  result.note = d.additionalData?.note ?? result.note;
                  return result;
                }
                break;
              }
            }
          } catch {
            //
          }
        }
      }, datas).promise
    ).filter((info) => info !== undefined) as ImportFileInfo[];
    const petaFileIds = (
      await this.importFilesFromFileInfos({
        fileInfos,
        extract: true,
      })
    ).map((petaFile) => petaFile.id);
    return petaFileIds;
  }
  public async importFilesFromFileInfos(
    params: {
      fileInfos: ImportFileInfo[];
      extract?: boolean;
    },
    silent = false,
  ) {
    const controller = usePetaFilesController();
    const logger = useLogger();
    const tasks = useTasks();
    if (params.fileInfos.length === 0) {
      return [];
    }
    const task = tasks.spawn("importFilesFromFilePaths", silent);
    const log = logger.logMainChunk();
    log.debug("## Import Images From File Paths");
    const fileInfos: ImportFileInfo[] = [];
    if (params.extract) {
      fileInfos.push(...(await this.getFileInfosRecursive(log, task, params.fileInfos)));
    } else {
      fileInfos.push(...params.fileInfos);
    }
    let addedFileCount = 0;
    let processedFileCount = 0;
    let error = false;
    const petaFiles: PetaFile[] = [];
    const importImage = async (fileInfo: ImportFileInfo, index: number) => {
      log.debug(
        "import:",
        index + 1,
        "/",
        fileInfos.length,
        `encrypted: ${fileInfo.secureTempFile}`,
      );
      let result = ImportImageResult.SUCCESS;
      let errorReason = "";
      try {
        const name = basename(fileInfo.path);
        const fileDate = (await stat(fileInfo.path)).mtime;
        const readStream = () =>
          fileInfo.secureTempFile
            ? secureFile.decrypt.toStream(fileInfo.path, useSecureTempFileKey())
            : createReadStream(fileInfo.path);
        if (!(await isSupportedFile(readStream()))) {
          throw new Error("unsupported file");
        }
        const id = await fileSHA256(readStream());
        const exists = await controller.getPetaFile(id);
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
            doEncrypt: true,
            secureTempFile: fileInfo.secureTempFile,
          });
          if (petaFile === undefined) {
            throw new Error("unsupported file");
          }
          await controller.updateMultiple([petaFile], "insert", true);
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
      task.emitStatus({
        i18nKey: "tasks.importingFiles",
        progress: {
          all: fileInfos.length,
          current: processedFileCount,
        },
        log: [result, `${errorReason !== "" ? `(${errorReason})` : ""}${fileInfo.path}`],
        status: "progress",
        cancelable: true,
      });
    };
    const result = ppa(importImage, fileInfos, CPU_LENGTH);
    task.onCancel = result.cancel;
    try {
      await result.promise;
    } catch (err) {
      //
    }
    log.debug("return:", addedFileCount, "/", fileInfos.length);
    task.emitStatus({
      i18nKey: "tasks.importingFiles",
      log: [addedFileCount.toString(), fileInfos.length.toString()],
      status: error ? "failed" : "complete",
    });
    return petaFiles;
  }
  private async getFileInfosRecursive(
    log: LogChunk,
    task: TaskHandler,
    fileInfos: ImportFileInfo[],
  ) {
    const newFileInfos: ImportFileInfo[] = [];
    log.debug("###List Files", fileInfos.length);
    task.emitStatus({
      i18nKey: "tasks.listingFiles",
      status: "begin",
      log: [],
      cancelable: true,
    });
    try {
      for (let i = 0; i < fileInfos.length; i++) {
        const fileInfo = fileInfos[i];
        if (!fileInfo) continue;
        const readDirResult = file.readDirRecursive(fileInfo.path);
        task.onCancel = readDirResult.cancel;
        newFileInfos.push(
          ...(await readDirResult.files).map((path) => ({
            ...fileInfo,
            path,
            note: fileInfo.note,
            name: fileInfo.name,
          })),
        );
      }
    } catch (error) {
      task.emitStatus({
        i18nKey: "tasks.listingFiles",
        status: "failed",
        log: [],
        cancelable: true,
      });
      return [];
    }
    log.debug("complete", newFileInfos.length);
    return newFileInfos;
  }
}
export const fileImporterKey = createKey<FileImporter>("fileImporter");
export const useFileImporter = createUseFunction(fileImporterKey);
