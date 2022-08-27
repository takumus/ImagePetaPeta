import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import * as Path from "path";
import * as file from "@/mainProcess/storages/file";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import DB from "@/mainProcess/storages/db";
import { MainEvents } from "@/commons/api/mainEvents";
import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Settings } from "@/commons/datas/settings";
import Config from "@/mainProcess/storages/config";
import { runExternalApplication } from "@/mainProcess/utils/runExternalApplication";
import * as Tasks from "@/mainProcess/tasks/task";
import axios from "axios";
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import dataUriToBuffer from "data-uri-to-buffer";
import { PetaDataPetaImages } from "@/mainProcess/petaDatas/petaDataPetaImages";
import { PetaDataPetaBoards } from "@/mainProcess/petaDatas/petaDataPetaBoards";
import { PetaDataPetaTags } from "@/mainProcess/petaDatas/petaDataPetaTags";
export class PetaDatas {
  petaImages: PetaDataPetaImages;
  petaBoards: PetaDataPetaBoards;
  petaTags: PetaDataPetaTags;
  constructor(
    public datas: {
      dbPetaImages: DB<PetaImage>;
      dbPetaBoard: DB<PetaBoard>;
      dbPetaTags: DB<PetaTag>;
      dbPetaImagesPetaTags: DB<PetaImagePetaTag>;
      configSettings: Config<Settings>;
    },
    public paths: {
      DIR_IMAGES: string;
      DIR_THUMBNAILS: string;
      DIR_TEMP: string;
    },
    public emitMainEvent: <U extends keyof MainEvents>(
      key: U,
      ...args: Parameters<MainEvents[U]>
    ) => void,
    public mainLogger: MainLogger,
  ) {
    this.petaImages = new PetaDataPetaImages(this);
    this.petaBoards = new PetaDataPetaBoards(this);
    this.petaTags = new PetaDataPetaTags(this);
  }
  async importImagesByDragAndDrop(
    htmls: string[],
    arrayBuffers: ArrayBuffer[],
    filePaths: string[],
  ) {
    let petaImages: PetaImage[] = [];
    const urls: string[] = [];
    const log2 = this.mainLogger.logChunk();
    try {
      htmls.map((html) => {
        try {
          urls.push(getURLFromImgTag(html));
        } catch (error) {
          //
          log2.error("invalid html", error);
        }
      });
      log2.log("1.trying to download:", urls);
      const datas = await promiseSerial(async (url) => {
        let data: Buffer;
        let remoteURL = "";
        if (url.trim().indexOf("data:") === 0) {
          // dataURIだったら
          data = dataUriToBuffer(url);
        } else {
          // 普通のurlだったら
          data = (await axios.get(url, { responseType: "arraybuffer" })).data;
          remoteURL = url;
        }
        return {
          buffer: data,
          note: remoteURL,
          name: "downloaded",
        };
      }, urls).promise;
      if (datas.length > 0) {
        petaImages = await this.importImagesFromBuffers(datas);
        log2.log("result:", petaImages.length);
      }
    } catch (error) {
      log2.error(error);
    }
    const log3 = this.mainLogger.logChunk();
    try {
      if (petaImages.length === 0) {
        if (arrayBuffers.length > 0) {
          log3.log("2.trying to read ArrayBuffer:", arrayBuffers.length);
          petaImages = await this.importImagesFromBuffers(
            arrayBuffers.map((ab) => {
              return {
                buffer: Buffer.from(ab),
                name: urls.length > 0 ? "downloaded" : "noname",
                note: urls[0] || "",
              };
            }),
          );
          log3.log("result:", petaImages.length);
        }
      }
    } catch (error) {
      log3.error(error);
    }
    const log4 = this.mainLogger.logChunk();
    try {
      if (petaImages.length === 0) {
        log4.log("3.trying to read filePath:", filePaths.length);
        petaImages = await this.importImagesFromFilePaths(filePaths);
        log4.log("result:", petaImages.length);
      }
    } catch (error) {
      log4.error(error);
    }
    return petaImages.map((petaImage) => petaImage.id);
  }
  async importImagesFromFilePaths(filePaths: string[]) {
    return Tasks.spawn(
      "ImportImagesFromFilePaths",
      async (handler) => {
        const log = this.mainLogger.logChunk();
        log.log("##Import Images From File Paths");
        log.log("###List Files", filePaths.length);
        handler.emitStatus({
          i18nKey: "tasks.listingFiles",
          status: "begin",
          log: [],
          cancelable: true,
        });
        // emitMainEvent("taskProgress", {
        //   progress: 0,
        //   file: filePaths.join("\n"),
        //   result: ImportImageResult.LIST
        // });
        const _filePaths: string[] = [];
        try {
          for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            if (!filePath) continue;
            const readDirResult = file.readDirRecursive(filePath, () => {
              //
            });
            handler.onCancel = readDirResult.cancel;
            _filePaths.push(...(await readDirResult.files));
          }
        } catch (error) {
          handler.emitStatus({
            i18nKey: "tasks.listingFiles",
            status: "failed",
            log: ["tasks.listingFiles.logs.failed"],
            cancelable: true,
          });
          return [];
        }
        log.log("complete", _filePaths.length);
        let addedFileCount = 0;
        const petaImages: PetaImage[] = [];
        const importImage = async (filePath: string, index: number) => {
          log.log("import:", index + 1, "/", _filePaths.length);
          let result = ImportImageResult.SUCCESS;
          try {
            const data = await file.readFile(filePath);
            const name = Path.basename(filePath);
            const fileDate = (await file.stat(filePath)).mtime;
            const addResult = await this.petaImages.importImage({
              data,
              name,
              fileDate,
              note: "",
            });
            if (addResult.exists) {
              result = ImportImageResult.EXISTS;
              petaImages.push(addResult.petaImage);
            } else {
              addedFileCount++;
              petaImages.push(addResult.petaImage);
            }
            log.log("imported", result);
          } catch (err) {
            log.error(err);
            result = ImportImageResult.ERROR;
          }
          handler.emitStatus({
            i18nKey: "tasks.importingFiles",
            progress: {
              all: _filePaths.length,
              current: index + 1,
            },
            log: [result, filePath],
            status: "progress",
            cancelable: true,
          });
        };
        const result = promiseSerial(importImage, _filePaths);
        handler.onCancel = result.cancel;
        try {
          await result.promise;
        } catch (err) {
          //
        }
        log.log("return:", addedFileCount, "/", _filePaths.length);
        handler.emitStatus({
          i18nKey: "tasks.importingFiles",
          log: [addedFileCount.toString(), _filePaths.length.toString()],
          status: addedFileCount === _filePaths.length ? "complete" : "failed",
        });
        this.emitMainEvent("updatePetaImages", petaImages, UpdateMode.UPSERT);
        return petaImages;
      },
      {},
      false,
    );
  }
  async waifu2x(petaImages: PetaImage[]) {
    return Tasks.spawn(
      "waifu2x",
      async (handler) => {
        const log = this.mainLogger.logChunk();
        const execFilePath = Path.resolve(this.datas.configSettings.data.waifu2x.execFilePath);
        let success = true;
        handler.emitStatus({
          i18nKey: "tasks.upconverting",
          log: [petaImages.length.toString()],
          status: "begin",
          cancelable: true,
        });
        log.log("execFilePath:", execFilePath);
        await promiseSerial(async (petaImage, index) => {
          const inputFile = this.petaImages.getImagePath(petaImage, ImageType.ORIGINAL);
          const outputFile = `${Path.resolve(this.paths.DIR_TEMP, petaImage.id)}.png`;
          const parameters = this.datas.configSettings.data.waifu2x.parameters.map((param) => {
            if (param === "$$INPUT$$") {
              return inputFile;
            }
            if (param === "$$OUTPUT$$") {
              return outputFile;
            }
            return param;
          });
          const childProcess = runExternalApplication(
            execFilePath,
            parameters,
            process.platform === "win32" ? "utf16le" : "utf8",
            (l) => {
              log.log(l);
              handler.emitStatus({
                i18nKey: "tasks.upconverting",
                progress: {
                  all: petaImages.length,
                  current: index + 1,
                },
                log: [l],
                status: "progress",
                cancelable: true,
              });
            },
          );
          handler.onCancel = childProcess.kill;
          handler.emitStatus({
            i18nKey: "tasks.upconverting",
            progress: {
              all: petaImages.length,
              current: index + 1,
            },
            log: [[execFilePath, ...parameters].join(" ")],
            status: "progress",
            cancelable: true,
          });
          const result = await childProcess.promise;
          handler.onCancel = undefined;
          if (result) {
            const newPetaImages = await this.importImagesFromFilePaths([outputFile]);
            if (newPetaImages.length < 1) {
              log.log("return: false");
              return false;
            }
            const newPetaImage = newPetaImages[0];
            if (!newPetaImage) {
              log.log("return: false");
              return false;
            }
            newPetaImage.addDate = petaImage.addDate;
            newPetaImage.fileDate = petaImage.fileDate;
            newPetaImage.name = petaImage.name + "-converted";
            log.log("update new petaImage");
            await this.petaImages.updatePetaImages([newPetaImage], UpdateMode.UPDATE);
            this.emitMainEvent("updatePetaImages", [newPetaImage], UpdateMode.UPDATE);
            log.log("get tags");
            const pipts = await this.datas.dbPetaImagesPetaTags.find({ petaImageId: petaImage.id });
            log.log("tags:", pipts.length);
            await promiseSerial(async (pipt, index) => {
              log.log("copy tag: (", index, "/", pipts.length, ")");
              const newPIPT = createPetaImagePetaTag(newPetaImage.id, pipt.petaTagId);
              await this.datas.dbPetaImagesPetaTags.update({ id: newPIPT.id }, newPIPT, true);
            }, pipts).promise;
            log.log(`add "before waifu2x" tag to old petaImage`);
            const name = "before waifu2x";
            const datePetaTag =
              (await this.datas.dbPetaTags.find({ name: name }))[0] || createPetaTag(name);
            await this.petaTags.updatePetaTags([datePetaTag], UpdateMode.UPSERT);
            await this.petaTags.updatePetaImagesPetaTags(
              [petaImage.id],
              [datePetaTag.id],
              UpdateMode.UPSERT,
            );
          } else {
            success = false;
          }
        }, petaImages).promise;
        handler.emitStatus({
          i18nKey: "tasks.upconverting",
          log: [],
          status: success ? "complete" : "failed",
        });
        return success;
      },
      {},
      false,
    );
  }
  async importImagesFromBuffers(datas: { buffer: Buffer; name: string; note: string }[]) {
    return Tasks.spawn(
      "ImportImagesFromBuffers",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.importingFiles",
          log: [],
          status: "begin",
        });
        const log = this.mainLogger.logChunk();
        log.log("##Import Images From Buffers");
        log.log("buffers:", datas.length);
        let addedFileCount = 0;
        const petaImages: PetaImage[] = [];
        const importImage = async (
          data: { buffer: Buffer; name: string; note: string },
          index: number,
        ) => {
          log.log("import:", index + 1, "/", datas.length);
          let result = ImportImageResult.SUCCESS;
          try {
            const importResult = await this.petaImages.importImage({
              data: data.buffer,
              name: data.name,
              note: data.note,
            });
            if (importResult.exists) {
              result = ImportImageResult.EXISTS;
              petaImages.push(importResult.petaImage);
            } else {
              addedFileCount++;
              petaImages.push(importResult.petaImage);
            }
            log.log("imported", data.name, result);
          } catch (err) {
            log.error(err);
            result = ImportImageResult.ERROR;
          }
          handler.emitStatus({
            i18nKey: "tasks.importingFiles",
            progress: {
              all: datas.length,
              current: index + 1,
            },
            log: [result, data.name],
            status: "progress",
          });
        };
        const result = promiseSerial(importImage, datas);
        handler.onCancel = result.cancel;
        await result.promise;
        log.log("return:", addedFileCount, "/", datas.length);
        handler.emitStatus({
          i18nKey: "tasks.importingFiles",
          log: [addedFileCount.toString(), datas.length.toString()],
          status: addedFileCount === datas.length ? "complete" : "failed",
        });
        this.emitMainEvent("updatePetaImages", petaImages, UpdateMode.UPSERT);
        return petaImages;
      },
      {},
      false,
    );
  }
}
