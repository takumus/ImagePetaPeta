import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import * as Path from "path";
import * as file from "@/mainProcess/storages/file";
import * as Tasks from "@/mainProcess/tasks/task";
import crypto from "crypto";
import { ImageType } from "@/commons/datas/imageType";
import { migratePetaImage } from "@/mainProcess/utils/migrater";
import sharp from "sharp";
import { imageFormatToExtention } from "@/mainProcess/utils/imageFormatToExtention";
import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";
import { generateMetadataByWorker } from "@/mainProcess/utils/generateMetadataByWorker";
import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import dataUriToBuffer from "data-uri-to-buffer";
import axios from "axios";
import { getURLFromHTML } from "@/rendererProcess/utils/getURLFromHTML";
import { CPU_LENGTH } from "@/commons/cpu";
import { ppa } from "@/commons/utils/pp";
import { TaskStatusCode } from "@/commons/api/interfaces/task";
import { v4 as uuid } from "uuid";
export class PetaDataPetaImages {
  constructor(private parent: PetaDatas) {}
  public async updatePetaImages(datas: PetaImage[], mode: UpdateMode, silent = false) {
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
          this.parent.emitMainEvent("updatePetaTags", {
            petaImageIds: [],
            petaTagIds: [],
          });
          this.parent.emitMainEvent(
            "updatePetaTagCounts",
            await this.parent.petaTags.getPetaTagCounts(),
          );
        }
        this.parent.emitMainEvent("updatePetaImages", datas, mode);
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
    if (thumbnail === ImageType.ORIGINAL) {
      return Path.resolve(this.parent.paths.DIR_IMAGES, petaImage.file.original);
    } else {
      return Path.resolve(this.parent.paths.DIR_THUMBNAILS, petaImage.file.thumbnail);
    }
  }
  async getPetaImage(id: string) {
    const petaImage = (await this.parent.datas.dbPetaImages.find({ id }))[0];
    if (petaImage === undefined) {
      return undefined;
    }
    return migratePetaImage(petaImage);
  }
  async getPetaImages() {
    const data = await this.parent.datas.dbPetaImages.find({});
    const petaImages: PetaImages = {};
    data.forEach((pi) => {
      petaImages[pi.id] = migratePetaImage(pi);
    });
    return petaImages;
  }
  private async updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaImage");
    log.log("mode:", mode);
    log.log("image:", minimId(petaImage.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaImagesPetaTags.remove({ petaImageId: petaImage.id });
      await this.parent.datas.dbPetaImages.remove({ id: petaImage.id });
      await file.rm(this.getImagePath(petaImage, ImageType.ORIGINAL)).catch(() => {
        //
      });
      await file.rm(this.getImagePath(petaImage, ImageType.THUMBNAIL)).catch(() => {
        //
      });
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaImages.update({ id: petaImage.id }, petaImage);
    } else {
      await this.parent.datas.dbPetaImages.insert(petaImage);
    }
    return true;
  }
  async importImagesFromHTMLs(htmls: string[]) {
    const log = this.parent.mainLogger.logChunk();
    const urls: string[] = [];
    try {
      log.log("## Import Images From HTMLs");
      htmls.map((html) => {
        try {
          urls.push(getURLFromHTML(html));
        } catch (error) {
          //
          log.error("invalid html", error);
        }
      });
      const fileInfos = await ppa(async (url) => {
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
        const dist = Path.resolve(this.parent.paths.DIR_TEMP, uuid());
        await file.writeFile(dist, data);
        return {
          path: dist,
          note: remoteURL,
          name: "downloaded",
        } as ImportFileInfo;
      }, urls).promise;
      if (fileInfos.length > 0) {
        const petaImages = await this.importImagesFromFileInfos({
          fileInfos,
        });
        log.log("return:", petaImages.length);
        if (petaImages.length > 0) {
          return petaImages.map((petaImage) => petaImage.id);
        }
      }
    } catch (error) {
      log.error(error);
    }
    log.log("return:", 0);
    return [];
  }
  async importImagesFromBuffers(buffers: (ArrayBuffer | Buffer)[]) {
    const log = this.parent.mainLogger.logChunk();
    const urls: string[] = [];
    try {
      log.log("## Import Images From ArrayBuffers");
      if (buffers.length > 0) {
        const fileInfos = await ppa(async (buffer) => {
          const dist = Path.resolve(this.parent.paths.DIR_TEMP, uuid());
          await file.writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
          return {
            path: dist,
            note: urls[0] || "",
            name: urls.length > 0 ? "downloaded" : "noname",
          } as ImportFileInfo;
        }, buffers).promise;
        const petaImages = await this.importImagesFromFileInfos({ fileInfos });
        log.log("return:", petaImages.length);
        if (petaImages.length > 0) {
          return petaImages.map((petaImage) => petaImage.id);
        }
      }
    } catch (error) {
      log.error(error);
    }
    log.log("return:", 0);
    return [];
  }
  async importImagesFromFileInfos(
    params: {
      fileInfos: ImportFileInfo[];
      extract?: boolean;
    },
    silent = false,
  ) {
    if (params.fileInfos.length == 0) {
      return [];
    }
    return Tasks.spawn(
      "ImportImagesFromFilePaths",
      async (handler) => {
        const log = this.parent.mainLogger.logChunk();
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
    const log = this.parent.mainLogger.logChunk();
    this.parent.emitMainEvent("regenerateMetadatasBegin");
    const images = Object.values(await this.getPetaImages());
    let completed = 0;
    const generate = async (image: PetaImage) => {
      migratePetaImage(image);
      // if (image.metadataVersion >= PETAIMAGE_METADATA_VERSION) {
      //   return;
      // }
      const data = await file.readFile(
        Path.resolve(this.parent.paths.DIR_IMAGES, image.file.original),
      );
      const result = await generateMetadataByWorker({
        data,
        outputFilePath: Path.resolve(this.parent.paths.DIR_THUMBNAILS, image.file.original),
        size: BROWSER_THUMBNAIL_SIZE,
        quality: BROWSER_THUMBNAIL_QUALITY,
      });
      image.placeholder = result.placeholder;
      image.palette = result.palette;
      image.width = result.original.width;
      image.height = result.original.height;
      image.file.thumbnail = `${image.file.original}.${result.thumbnail.format}`;
      image.metadataVersion = PETAIMAGE_METADATA_VERSION;
      await this.updatePetaImages([image], UpdateMode.UPDATE, true);
      log.log(`thumbnail (${++completed} / ${images.length})`);
      this.parent.emitMainEvent("regenerateMetadatasProgress", completed, images.length);
    };
    await ppa((image) => generate(image), images, CPU_LENGTH).promise;
    this.parent.emitMainEvent("regenerateMetadatasComplete");
  }
  private async addImage(param: {
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
      outputFilePath: Path.resolve(this.parent.paths.DIR_THUMBNAILS, originalFileName),
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
      width: petaMetaData.original.width,
      height: petaMetaData.original.height,
      placeholder: petaMetaData.placeholder,
      palette: petaMetaData.palette,
      id: id,
      nsfw: false,
      metadataVersion: PETAIMAGE_METADATA_VERSION,
    };
    await file.writeFile(Path.resolve(this.parent.paths.DIR_IMAGES, originalFileName), param.data);
    return {
      petaImage: petaImage,
      exists: false,
    };
  }
}

interface ImportFileInfo {
  path: string;
  name?: string;
  note?: string;
}
