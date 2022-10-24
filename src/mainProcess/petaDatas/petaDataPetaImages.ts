import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import * as Path from "path";
import * as file from "@/mainProcess/storages/file";
import * as Tasks from "@/mainProcess/tasks/task";
import crypto from "crypto";
import { ImageType } from "@/commons/datas/imageType";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { migratePetaImage } from "@/mainProcess/utils/migrater";
import sharp from "sharp";
import pLimit from "p-limit";
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
export class PetaDataPetaImages {
  constructor(private parent: PetaDatas) {}
  public async updatePetaImages(datas: PetaImage[], mode: UpdateMode, silent = false) {
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
          status: "complete",
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
  async importImages(datas: { htmls: string[]; buffers: ArrayBuffer[]; filePaths: string[] }) {
    const log1 = this.parent.mainLogger.logChunk();
    const ids = datas.filePaths
      .filter(
        (filePath) =>
          Path.resolve(Path.dirname(filePath)) === Path.resolve(this.parent.paths.DIR_IMAGES),
      )
      .map((filePath) => Path.basename(filePath).split(".")[0] ?? "?");
    if (ids.length > 0 && ids.length === datas.filePaths.length) {
      log1.log("0.from browser");
      log1.log("result:", ids.length);
      return ids;
    }
    const log2 = this.parent.mainLogger.logChunk();
    let petaImages: PetaImage[] = [];
    const urls: string[] = [];
    try {
      log2.log("1.trying to download");
      datas.htmls.map((html) => {
        try {
          urls.push(getURLFromHTML(html));
        } catch (error) {
          //
          log2.error("invalid html", error);
        }
      });
      const buffers = await promiseSerial(async (url) => {
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
      if (buffers.length > 0) {
        petaImages = await this.importImagesFromBuffers(buffers);
        log2.log("result:", petaImages.length);
      }
    } catch (error) {
      log2.error(error);
    }
    const log3 = this.parent.mainLogger.logChunk();
    try {
      if (petaImages.length === 0) {
        if (datas.buffers.length > 0) {
          log3.log("2.trying to read ArrayBuffer:", datas.buffers.length);
          petaImages = await this.importImagesFromBuffers(
            datas.buffers.map((ab) => {
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
    const log4 = this.parent.mainLogger.logChunk();
    try {
      if (petaImages.length === 0) {
        log4.log("3.trying to read filePath:", datas.filePaths.length);
        petaImages = await this.importImagesFromFilePaths(datas.filePaths);
        log4.log("result:", petaImages.length);
      }
    } catch (error) {
      log4.error(error);
    }
    return petaImages.map((petaImage) => petaImage.id);
  }
  async importImagesFromFilePaths(filePaths: string[], silent = false) {
    if (filePaths.length == 0) {
      return [];
    }
    return Tasks.spawn(
      "ImportImagesFromFilePaths",
      async (handler) => {
        const log = this.parent.mainLogger.logChunk();
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
            const addResult = await this.addImage({
              data,
              name,
              fileDate,
              note: "",
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
        return petaImages;
      },
      {},
      silent,
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
        const log = this.parent.mainLogger.logChunk();
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
            const importResult = await this.addImage({
              data: data.buffer,
              name: data.name,
              note: data.note,
            });
            if (importResult.exists) {
              result = ImportImageResult.EXISTS;
              petaImages.push(importResult.petaImage);
            } else {
              await this.updatePetaImages([importResult.petaImage], UpdateMode.INSERT, true);
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
        return petaImages;
      },
      {},
      false,
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
    const limit = pLimit(CPU_LENGTH);
    await Promise.all(images.map((image) => limit(() => generate(image))));
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
