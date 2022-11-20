import { UpdateMode } from "@/commons/datas/updateMode";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { minimId } from "@/commons/utils/utils";
import * as Path from "path";
import * as file from "@/main/storages/file";
import * as Tasks from "@/main/tasks/task";
import crypto from "crypto";
import { ImageType } from "@/commons/datas/imageType";
import sharp from "sharp";
import { imageFormatToExtention } from "@/main/utils/imageFormatToExtention";
import { generateMetadata } from "@/main/utils/generateMetadata";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";
import { generateMetadataByWorker } from "@/main/utils/generateMetadataByWorker";
import { ImportImageResult } from "@/commons/datas/importImageResult";
import dataUriToBuffer from "data-uri-to-buffer";
import axios, { AxiosError } from "axios";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { ppa } from "@/commons/utils/pp";
import { TaskStatusCode } from "@/commons/datas/task";
import { v4 as uuid } from "uuid";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { createKey, inject } from "@/main/utils/di";
import { petaTagsControllerKey } from "@/main/controllers/petaTagsController";
import { dbPetaImagesKey, dbPetaImagesPetaTagsKey } from "@/main/databases";
import { mainLoggerKey } from "@/main/utils/mainLogger";
import { emitMainEventKey } from "@/main/utils/emitMainEvent";
import { pathsKey } from "@/main/utils/paths";
export class PetaImagesController {
  public async updatePetaImages(datas: PetaImage[], mode: UpdateMode, silent = false) {
    const petaTagsController = inject(petaTagsControllerKey);
    const emit = inject(emitMainEventKey);
    return Tasks.spawn(
      "UpdatePetaImages",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: TaskStatusCode.BEGIN,
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
            status: TaskStatusCode.PROGRESS,
          });
        };
        await ppa(update, datas).promise;
        if (mode === UpdateMode.REMOVE) {
          // Tileの更新対象なし
          emit("updatePetaTags", {
            petaImageIds: [],
            petaTagIds: [],
          });
          emit("updatePetaTagCounts", await petaTagsController.getPetaTagCounts());
        }
        emit("updatePetaImages", datas, mode);
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
  getImagePath(petaImage: PetaImage, thumbnail: ImageType) {
    const paths = inject(pathsKey);
    if (thumbnail === ImageType.ORIGINAL) {
      return Path.resolve(paths.DIR_IMAGES, petaImage.file.original);
    } else {
      return Path.resolve(paths.DIR_THUMBNAILS, petaImage.file.thumbnail);
    }
  }
  async getPetaImage(id: string) {
    const dbPetaImages = inject(dbPetaImagesKey);
    const petaImage = (await dbPetaImages.find({ id }))[0];
    if (petaImage === undefined) {
      return undefined;
    }
    return petaImage;
  }
  async getPetaImages() {
    const dbPetaImages = inject(dbPetaImagesKey);
    const data = dbPetaImages.getAll();
    const petaImages: PetaImages = {};
    data.forEach((pi) => {
      petaImages[pi.id] = pi;
    });
    return petaImages;
  }
  private async updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    const dbPetaImages = inject(dbPetaImagesKey);
    const dbPetaImagesPetaTags = inject(dbPetaImagesPetaTagsKey);
    const mainLogger = inject(mainLoggerKey);
    const log = mainLogger.logChunk();
    log.log("##Update PetaImage");
    log.log("mode:", mode);
    log.log("image:", minimId(petaImage.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaImagesPetaTags.remove({ petaImageId: petaImage.id });
      await dbPetaImages.remove({ id: petaImage.id });
      await file.rm(this.getImagePath(petaImage, ImageType.ORIGINAL)).catch(() => {
        //
      });
      await file.rm(this.getImagePath(petaImage, ImageType.THUMBNAIL)).catch(() => {
        //
      });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaImages.update({ id: petaImage.id }, petaImage);
    } else {
      await dbPetaImages.insert(petaImage);
    }
    return true;
  }
  async createFileInfoFromURL(url: string) {
    const mainLogger = inject(mainLoggerKey);
    const paths = inject(pathsKey);
    const log = mainLogger.logChunk();
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
    const mainLogger = inject(mainLoggerKey);
    const paths = inject(pathsKey);
    const log = mainLogger.logChunk();
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
  async importImagesFromFileInfos(
    params: {
      fileInfos: ImportFileInfo[];
      extract?: boolean;
    },
    silent = false,
  ) {
    const mainLogger = inject(mainLoggerKey);
    if (params.fileInfos.length == 0) {
      return [];
    }
    return Tasks.spawn(
      "ImportImagesFromFilePaths",
      async (handler) => {
        const log = mainLogger.logChunk();
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
              log: ["tasks.listingFiles.logs.failed"],
              cancelable: true,
            });
            return [];
          }
          log.log("complete", fileInfos.length);
        } else {
          fileInfos.push(...params.fileInfos);
        }
        let addedFileCount = 0;
        let error = false;
        const petaImages: PetaImage[] = [];
        const importImage = async (fileInfo: ImportFileInfo, index: number) => {
          log.log("import:", index + 1, "/", fileInfos.length);
          let result = ImportImageResult.SUCCESS;
          try {
            const data = await file.readFile(fileInfo.path);
            const name = Path.basename(fileInfo.path);
            const fileDate = (await file.stat(fileInfo.path)).mtime;
            const addResult = await this.addImage({
              data,
              name: fileInfo.name ?? name,
              fileDate,
              note: fileInfo.note ?? "",
            });
            if (addResult.exists) {
              result = ImportImageResult.EXISTS;
              petaImages.push(addResult.petaImage);
            } else {
              await this.updatePetaImages([addResult.petaImage], UpdateMode.INSERT, true);
              addedFileCount++;
              petaImages.push(addResult.petaImage);
            }
            log.log("imported", result);
          } catch (err) {
            log.error(err);
            result = ImportImageResult.ERROR;
            error = true;
          }
          handler.emitStatus({
            i18nKey: "tasks.importingFiles",
            progress: {
              all: fileInfos.length,
              current: index + 1,
            },
            log: [result, fileInfo.path],
            status: TaskStatusCode.PROGRESS,
            cancelable: true,
          });
        };
        const result = ppa(importImage, fileInfos);
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
        return petaImages;
      },
      {},
      silent,
    );
  }
  async regenerateMetadatas() {
    const mainLogger = inject(mainLoggerKey);
    const emit = inject(emitMainEventKey);
    const paths = inject(pathsKey);
    const log = mainLogger.logChunk();
    emit("regenerateMetadatasBegin");
    const images = Object.values(await this.getPetaImages());
    let completed = 0;
    const generate = async (image: PetaImage) => {
      // if (image.metadataVersion >= PETAIMAGE_METADATA_VERSION) {
      //   return;
      // }
      const data = await file.readFile(Path.resolve(paths.DIR_IMAGES, image.file.original));
      const result = await generateMetadataByWorker({
        data,
        outputFilePath: Path.resolve(paths.DIR_THUMBNAILS, image.file.original),
        size: BROWSER_THUMBNAIL_SIZE,
        quality: BROWSER_THUMBNAIL_QUALITY,
      });
      image.file.thumbnail = `${image.file.original}.${result.thumbnail.format}`;
      image.metadata = {
        type: "image",
        palette: result.palette,
        width: result.original.width,
        height: result.original.height,
        version: PETAIMAGE_METADATA_VERSION,
      };
      await this.updatePetaImages([image], UpdateMode.UPDATE, true);
      log.log(`thumbnail (${++completed} / ${images.length})`);
      emit("regenerateMetadatasProgress", completed, images.length);
    };
    await ppa((image) => generate(image), images, CPU_LENGTH).promise;
    emit("regenerateMetadatasComplete");
  }
  private async addImage(param: {
    data: Buffer;
    name: string;
    note: string;
    fileDate?: Date;
    addDate?: Date;
  }): Promise<{ exists: boolean; petaImage: PetaImage }> {
    const paths = inject(pathsKey);
    const id = crypto.createHash("sha256").update(param.data).digest("hex");
    const exists = await this.getPetaImage(id);
    if (exists)
      return {
        petaImage: exists,
        exists: true,
      };
    const metadata = await sharp(param.data, { limitInputPixels: false }).metadata();
    let extName: string | undefined | null = undefined;
    if (metadata.orientation !== undefined) {
      // jpegの角度情報があったら回転する。pngにする。
      param.data = await sharp(param.data, { limitInputPixels: false }).rotate().png().toBuffer();
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
      outputFilePath: Path.resolve(paths.DIR_THUMBNAILS, originalFileName),
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
      id: id,
      nsfw: false,
      metadata: {
        type: "image",
        width: petaMetaData.original.width,
        height: petaMetaData.original.height,
        palette: petaMetaData.palette,
        version: PETAIMAGE_METADATA_VERSION,
      },
    };
    await file.writeFile(Path.resolve(paths.DIR_IMAGES, originalFileName), param.data);
    return {
      petaImage: petaImage,
      exists: false,
    };
  }
}
export const petaImagesControllerKey = createKey<PetaImagesController>("petaImagesController");
