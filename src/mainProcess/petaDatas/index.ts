import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { minimId } from "@/commons/utils/utils";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import * as Path from "path";
import * as file from "@/mainProcess/storages/file";
import { createPetaBoard, PetaBoard } from "@/commons/datas/petaBoard";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import DB from "@/mainProcess/storages/db";
import { MainEvents } from "@/commons/api/mainEvents";
import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Settings } from "@/commons/datas/settings";
import Config from "@/mainProcess/storages/config";
import sharp from "sharp";
import crypto from "crypto";
import dateFormat from "dateformat";
import { upgradePetaBoard, upgradePetaImage } from "@/mainProcess/utils/upgrader";
import { imageFormatToExtention } from "@/mainProcess/utils/imageFormatToExtention";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  DEFAULT_BOARD_NAME,
  PETAIMAGE_METADATA_VERSION,
  PLACEHOLDER_COMPONENT,
  PLACEHOLDER_SIZE,
  UNTAGGED_ID,
} from "@/commons/defines";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { runExternalApplication } from "@/mainProcess/utils/runExternalApplication";
import { TaskStatus } from "@/commons/api/interfaces/task";
import * as Tasks from "@/mainProcess/tasks/task";
import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import axios from "axios";
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import dataUriToBuffer from "data-uri-to-buffer";
export class PetaDatas {
  constructor(
    private datas: {
      dbPetaImages: DB<PetaImage>;
      dbPetaBoard: DB<PetaBoard>;
      dbPetaTags: DB<PetaTag>;
      dbPetaImagesPetaTags: DB<PetaImagePetaTag>;
      configSettings: Config<Settings>;
    },
    private paths: {
      DIR_IMAGES: string;
      DIR_THUMBNAILS: string;
      DIR_TEMP: string;
    },
    private emitMainEvent: <U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>) => void,
    private mainLogger: MainLogger,
  ) {}
  async updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaImage");
    log.log("mode:", mode);
    log.log("image:", minimId(petaImage.id));
    if (mode === UpdateMode.REMOVE) {
      await this.datas.dbPetaImagesPetaTags.remove({ petaImageId: petaImage.id });
      log.log("removed tags");
      await this.datas.dbPetaImages.remove({ id: petaImage.id });
      log.log("removed db");
      await file.rm(this.getImagePath(petaImage, ImageType.ORIGINAL)).catch(() => {
        //
      });
      log.log("removed file");
      await file.rm(this.getImagePath(petaImage, ImageType.THUMBNAIL)).catch(() => {
        //
      });
      log.log("removed thumbnail");
      return true;
    }
    await this.datas.dbPetaImages.update({ id: petaImage.id }, petaImage, mode === UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  async updatePetaImages(datas: PetaImage[], mode: UpdateMode) {
    return Tasks.spawn(
      "UpdatePetaImages",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: "begin",
        });
        const update = async (data: PetaImage, index: number) => {
          await this.updatePetaImage(data, mode);
          handler.emitStatus({
            i18nKey: "tasks.updateDatas",
            progress: {
              all: datas.length,
              current: index + 1,
            },
            log: [data.id],
            status: "progress",
          });
        };
        await promiseSerial(update, datas).promise;
        if (mode === UpdateMode.REMOVE) {
          this.emitMainEvent("updatePetaTags");
        }
        this.emitMainEvent("updatePetaImages", datas, mode);
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: "complete",
        });
      },
      {},
    );
  }
  async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaBoard");
    log.log("mode:", mode);
    log.log("board:", minimId(board.id));
    if (mode === UpdateMode.REMOVE) {
      await this.datas.dbPetaBoard.remove({ id: board.id });
      log.log("removed");
      return true;
    }
    await this.datas.dbPetaBoard.update({ id: board.id }, board, mode === UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  async getPetaImageIdsByPetaTagIds(petaTagIds: string[] | undefined) {
    const log = this.mainLogger.logChunk();
    // all
    if (!petaTagIds) {
      log.log("type: all");
      const ids = (await this.datas.dbPetaImages.find({})).map((pi) => pi.id);
      log.log("return:", ids.length);
      return ids;
    }
    // untagged
    if (petaTagIds.length === 0) {
      log.log("type: untagged");
      const taggedIds = Array.from(
        new Set(
          (await this.datas.dbPetaImagesPetaTags.find({})).map((pipt) => {
            return pipt.petaImageId;
          }),
        ),
      );
      const ids = (
        await this.datas.dbPetaImages.find({
          id: {
            $nin: taggedIds,
          },
        })
      ).map((pi) => pi.id);
      return ids;
    }
    // filter by ids
    log.log("type: filter");
    const pipts = await this.datas.dbPetaImagesPetaTags.find({
      $or: petaTagIds.map((id) => {
        return {
          petaTagId: id,
        };
      }),
    });
    const ids = Array.from(
      new Set(
        pipts.map((pipt) => {
          return pipt.petaImageId;
        }),
      ),
    ).filter((id) => {
      return (
        pipts.filter((pipt) => {
          return pipt.petaImageId === id;
        }).length === petaTagIds.length
      );
    });
    return ids;
  }
  async getPetaTagIdsByPetaImageIds(petaImageIds: string[]) {
    const log = this.mainLogger.logChunk();
    let pipts: PetaImagePetaTag[] = [];
    // console.time(log.uid);
    pipts = await this.datas.dbPetaImagesPetaTags.find({
      $or: petaImageIds.map((petaImageId) => {
        return { petaImageId };
      }),
    });
    // console.timeEnd(log.uid);
    const ids = Array.from(
      new Set(
        pipts.map((pipt) => {
          return pipt.petaTagId;
        }),
      ),
    );
    const petaTagIds = ids.filter((id) => {
      return (
        pipts.filter((pipt) => {
          return pipt.petaTagId === id;
        }).length === petaImageIds.length
      );
    });
    return petaTagIds;
  }
  async getPetaTagInfos(untaggedName: string) {
    const log = this.mainLogger.logChunk();
    const petaTags = await this.datas.dbPetaTags.find({});
    const taggedIds = Array.from(
      new Set(
        (await this.datas.dbPetaImagesPetaTags.find({})).map((pipt) => {
          return pipt.petaImageId;
        }),
      ),
    );
    const count = await this.datas.dbPetaImages.count({
      id: {
        $nin: taggedIds,
      },
    });
    const petaTagInfos = await promiseSerial(async (petaTag) => {
      const info = {
        petaTag,
        count: await this.datas.dbPetaImagesPetaTags.count({ petaTagId: petaTag.id }),
      } as PetaTagInfo;
      return info;
    }, petaTags).promise;
    log.log("return:", petaTagInfos.length);
    petaTagInfos.sort((a, b) => {
      if (a.petaTag.name < b.petaTag.name) {
        return -1;
      } else {
        return 1;
      }
    });
    petaTagInfos.unshift({
      petaTag: {
        index: 0,
        id: UNTAGGED_ID,
        name: untaggedName,
      },
      count: count,
    });
    return petaTagInfos;
  }
  async regenerateMetadatas() {
    const log = this.mainLogger.logChunk();
    this.emitMainEvent("regenerateMetadatasBegin");
    const images = await this.datas.dbPetaImages.find({});
    const generate = async (image: PetaImage, i: number) => {
      upgradePetaImage(image);
      if (image.metadataVersion >= PETAIMAGE_METADATA_VERSION) {
        return;
      }
      const data = await file.readFile(Path.resolve(this.paths.DIR_IMAGES, image.file.original));
      const result = await generateMetadata({
        data,
        outputFilePath: Path.resolve(this.paths.DIR_THUMBNAILS, image.file.original),
        size: BROWSER_THUMBNAIL_SIZE,
        quality: BROWSER_THUMBNAIL_QUALITY,
      });
      image.placeholder = result.placeholder;
      image.palette = result.palette;
      image.file.thumbnail = `${image.file.original}.${result.thumbnail.format}`;
      image.metadataVersion = PETAIMAGE_METADATA_VERSION;
      await this.updatePetaImage(image, UpdateMode.UPDATE);
      log.log(`thumbnail (${i + 1} / ${images.length})`);
      this.emitMainEvent("regenerateMetadatasProgress", i + 1, images.length);
    };
    await promiseSerial(generate, images).promise;
    this.emitMainEvent("regenerateMetadatasComplete");
  }
  async updatePetaTag(tag: PetaTag, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(tag.id));
    if (mode === UpdateMode.REMOVE) {
      await this.datas.dbPetaImagesPetaTags.remove({ petaTagId: tag.id });
      await this.datas.dbPetaTags.remove({ id: tag.id });
      log.log("removed");
      return true;
    }
    // tag.petaImages = Array.from(new Set(tag.petaImages));
    await this.datas.dbPetaTags.update({ id: tag.id }, tag, mode === UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  async updatePetaImagesPetaTags(petaImageIds: string[], petaTagIds: string[], mode: UpdateMode) {
    return Tasks.spawn(
      "UpdatePetaImagesPetaTags",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: "begin",
          log: [],
        });
        await promiseSerial(async (petaImageId, iIndex) => {
          await promiseSerial(async (petaTagId, tIndex) => {
            await this.updatePetaImagePetaTag(createPetaImagePetaTag(petaImageId, petaTagId), mode);
            handler.emitStatus({
              i18nKey: "tasks.updateDatas",
              progress: {
                all: petaImageIds.length * petaTagIds.length,
                current: iIndex * petaTagIds.length + tIndex + 1,
              },
              status: "progress",
              log: [petaTagId, petaImageId],
            });
          }, petaTagIds).promise;
        }, petaImageIds).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: "complete",
          log: [],
        });
        if (mode != UpdateMode.UPDATE) {
          this.emitMainEvent("updatePetaTags");
        }
      },
      {},
    );
  }
  async updatePetaImagePetaTag(petaImagePetaTag: PetaImagePetaTag, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaImagePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaImagePetaTag.id));
    if (mode === UpdateMode.REMOVE) {
      await this.datas.dbPetaImagesPetaTags.remove({ id: petaImagePetaTag.id });
      log.log("removed");
      return true;
    }
    await this.datas.dbPetaImagesPetaTags.update(
      { id: petaImagePetaTag.id },
      petaImagePetaTag,
      mode === UpdateMode.UPSERT,
    );
    log.log("updated");
    return true;
  }
  getImagePath(petaImage: PetaImage, thumbnail: ImageType) {
    if (thumbnail === ImageType.ORIGINAL) {
      return Path.resolve(this.paths.DIR_IMAGES, petaImage.file.original);
    } else {
      return Path.resolve(this.paths.DIR_THUMBNAILS, petaImage.file.thumbnail);
    }
  }
  async importImagesByDragAndDrop(htmls: string[], arrayBuffers: ArrayBuffer[], filePaths: string[]) {
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
                note: urls.length > 0 ? urls[0]! : "",
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
            const readDirResult = file.readDirRecursive(filePath, (filePaths) => {
              // console.log(filePaths);
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
            const addResult = await this.importImage({
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
    );
  }
  async getPetaBoards() {
    const log = this.mainLogger.logChunk();
    const boards: { [id: string]: PetaBoard } = {};
    (await this.datas.dbPetaBoard.find({})).forEach((board) => {
      // バージョンアップ時のプロパティ更新
      upgradePetaBoard(board);
      boards[board.id] = board;
    });
    return boards;
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
          const inputFile = this.getImagePath(petaImage, ImageType.ORIGINAL);
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
            await this.updatePetaImage(newPetaImage, UpdateMode.UPDATE);
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
            const datePetaTag = (await this.datas.dbPetaTags.find({ name: name }))[0] || createPetaTag(name);
            await this.updatePetaImagePetaTag(createPetaImagePetaTag(petaImage.id, datePetaTag.id), UpdateMode.UPSERT);
            await this.updatePetaTag(datePetaTag, UpdateMode.UPSERT);
            this.emitMainEvent("updatePetaTags");
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
    );
  }
  async getPetaImages() {
    const data = await this.datas.dbPetaImages.find({});
    const petaImages: PetaImages = {};
    data.forEach((pi) => {
      petaImages[pi.id] = upgradePetaImage(pi);
    });
    return petaImages;
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
        const importImage = async (data: { buffer: Buffer; name: string; note: string }, index: number) => {
          log.log("import:", index + 1, "/", datas.length);
          let result = ImportImageResult.SUCCESS;
          try {
            const importResult = await this.importImage({
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
    );
  }
  async getPetaImage(id: string) {
    return (await this.datas.dbPetaImages.find({ id }))[0];
  }
  async importImage(param: {
    data: Buffer;
    name: string;
    note: string;
    fileDate?: Date;
    addDate?: Date;
  }): Promise<{ exists: boolean; petaImage: PetaImage }> {
    const id = crypto.createHash("sha256").update(param.data).digest("hex");
    const exists = await this.getPetaImage(id);
    if (exists)
      return {
        petaImage: upgradePetaImage(exists),
        exists: true,
      };
    const metadata = await sharp(param.data).metadata();
    let extName: string | undefined | null = undefined;
    if (metadata.orientation !== undefined) {
      // jpegの角度情報があったら回転する。pngにする。
      param.data = await sharp(param.data).rotate().png().toBuffer();
      extName = "png";
    } else {
      // formatを拡張子にする。
      extName = imageFormatToExtention(metadata.format);
    }
    if (extName === undefined) {
      throw new Error("invalid image file type");
    }
    const addDate = param.addDate || new Date();
    const fileDate = param.fileDate || new Date();
    const originalFileName = `${id}.${extName}`;
    const petaMetaData = await generateMetadata({
      data: param.data,
      outputFilePath: Path.resolve(this.paths.DIR_THUMBNAILS, originalFileName),
      size: BROWSER_THUMBNAIL_SIZE,
      quality: BROWSER_THUMBNAIL_QUALITY,
    });
    const petaImage: PetaImage = {
      file: {
        original: originalFileName,
        thumbnail: `${originalFileName}.${petaMetaData.thumbnail.format}`,
      },
      name: param.name,
      note: param.note,
      fileDate: fileDate.getTime(),
      addDate: addDate.getTime(),
      width: 1,
      height: petaMetaData.original.height / petaMetaData.original.width,
      placeholder: petaMetaData.placeholder,
      palette: petaMetaData.palette,
      id: id,
      nsfw: false,
      metadataVersion: PETAIMAGE_METADATA_VERSION,
    };
    await file.writeFile(Path.resolve(this.paths.DIR_IMAGES, originalFileName), param.data);
    await this.datas.dbPetaImages.update({ id: petaImage.id }, petaImage, true);
    return {
      petaImage: petaImage,
      exists: false,
    };
  }
}
