import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { minimId } from "@/commons/utils/utils";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import * as Path from "path";
import * as file from "@/mainProcess/storages/file";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { createPetaPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import DB from "@/mainProcess/storages/db";
import { MainEvents } from "@/commons/api/mainEvents";
import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Settings } from "@/commons/datas/settings";
import Config from "@/mainProcess/storages/config";
import sharp from "sharp";
import crypto from "crypto";
import dateFormat from "dateformat";
import { upgradePetaImage } from "@/mainProcess/utils/upgrader";
import { imageFormatToExtention } from "@/mainProcess/utils/imageFormatToExtention";
import { PLACEHOLDER_COMPONENT, PLACEHOLDER_SIZE } from "@/commons/defines";
import { encode as encodePlaceholder } from "blurhash";

export class PetaDatas {
  cancelImportImages: (() => void) | undefined;
  constructor(
    private datas: {
      dataPetaImages: DB<PetaImage>,
      dataPetaBoards: DB<PetaBoard>,
      dataPetaTags: DB<PetaTag>,
      dataPetaImagesPetaTags: DB<PetaImagePetaTag>,
      dataSettings: Config<Settings>
    },
    private paths: {
      DIR_IMAGES: string,
      DIR_THUMBNAILS: string
    },
    private emitMainEvent: <U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>) => void,
    private mainLogger: MainLogger
  ) {

  }
  /*------------------------------------
    PetaImage更新
  ------------------------------------*/
  async updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaImage");
    log.log("mode:", mode);
    log.log("image:", minimId(petaImage.id));
    if (mode == UpdateMode.REMOVE) {
      await this.datas.dataPetaImagesPetaTags.remove({ petaImageId: petaImage.id });
      log.log("removed tags");
      await this.datas.dataPetaImages.remove({ id: petaImage.id });
      log.log("removed db");
      await file.rm(this.getImagePath(petaImage, ImageType.ORIGINAL)).catch((e) => {});
      log.log("removed file");
      await file.rm(this.getImagePath(petaImage, ImageType.THUMBNAIL)).catch((e) => {});
      log.log("removed thumbnail");
      return true;
    }
    await this.datas.dataPetaImages.update({ id: petaImage.id }, petaImage, mode == UpdateMode.UPSERT);
    log.log("updated");
    // emitMainEvent("updatePetaImage", petaImage);
    return true;
  }
  /*------------------------------------
    PetaBoard更新
  ------------------------------------*/
  async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaBoard");
    log.log("mode:", mode);
    log.log("board:", minimId(board.id));
    if (mode == UpdateMode.REMOVE) {
      await this.datas.dataPetaBoards.remove({ id: board.id });
      log.log("removed");
      return true;
    }
    await this.datas.dataPetaBoards.update({ id: board.id }, board, mode == UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  /*------------------------------------
    PetaTag更新
  ------------------------------------*/
  async updatePetaTag(tag: PetaTag, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(tag.id));
    if (mode == UpdateMode.REMOVE) {
      await this.datas.dataPetaImagesPetaTags.remove({ petaTagId: tag.id });
      await this.datas.dataPetaTags.remove({ id: tag.id });
      log.log("removed");
      return true;
    }
    // tag.petaImages = Array.from(new Set(tag.petaImages));
    await this.datas.dataPetaTags.update({ id: tag.id }, tag, mode == UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  /*------------------------------------
    PetaImagePetaTag更新
  ------------------------------------*/
  async updatePetaImagePetaTag(petaImagePetaTag: PetaImagePetaTag, mode: UpdateMode) {
    const log = this.mainLogger.logChunk();
    log.log("##Update PetaImagePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaImagePetaTag.id));
    if (mode == UpdateMode.REMOVE) {
      await this.datas.dataPetaImagesPetaTags.remove({ id: petaImagePetaTag.id });
      log.log("removed");
      return true;
    }
    await this.datas.dataPetaImagesPetaTags.update({ id: petaImagePetaTag.id }, petaImagePetaTag, mode == UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  /*------------------------------------
    PetaImageからパスを取得
  ------------------------------------*/
  getImagePath(petaImage: PetaImage, thumbnail: ImageType) {
    if (thumbnail == ImageType.ORIGINAL) {
      return Path.resolve(this.paths.DIR_IMAGES, petaImage.file.original);
    } else {
      return Path.resolve(this.paths.DIR_THUMBNAILS, petaImage.file.thumbnail);
    }
  }
  /*------------------------------------
    画像インポート(ファイルパス)
  ------------------------------------*/
  async importImagesFromFilePaths(filePaths: string[]) {
    if (this.cancelImportImages) {
      this.cancelImportImages();
      this.cancelImportImages = undefined;
    }
    const log = this.mainLogger.logChunk();
    log.log("##Import Images From File Paths");
    log.log("###List Files", filePaths.length);
    this.emitMainEvent("importImagesBegin");
    // emitMainEvent("importImagesProgress", {
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
        this.cancelImportImages = readDirResult.cancel;
        _filePaths.push(...(await readDirResult.files));
      }
    } catch (error) {
      this.emitMainEvent("importImagesComplete", {
        addedFileCount: 0,
        fileCount: filePaths.length
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
          data, name, fileDate
        });
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        } else {
          addedFileCount++;
        }
        log.log("imported", result);
      } catch (err) {
        log.error(err);
        result = ImportImageResult.ERROR;
      }
      this.emitMainEvent("importImagesProgress", {
        allFileCount: _filePaths.length,
        currentFileCount: index + 1,
        file: filePath,
        result: result
      });
    }
    const result = promiseSerial(importImage, _filePaths);
    this.cancelImportImages = result.cancel;
    try {
      await result.value;
    } catch (err) {
      //
    }
    this.cancelImportImages = undefined;
    log.log("return:", addedFileCount, "/", _filePaths.length);
    this.emitMainEvent("importImagesComplete", {
      addedFileCount: addedFileCount,
      fileCount: _filePaths.length
    });
    if (this.datas.dataSettings.data.autoAddTag) {
      this.emitMainEvent("updatePetaTags");
    }
    return petaImages;
  }
  /*------------------------------------
    画像インポート(バッファー)
  ------------------------------------*/
  async importImagesFromBuffers(buffers: Buffer[], name: string) {
    if (this.cancelImportImages) {
      this.cancelImportImages();
      this.cancelImportImages = undefined;
    }
    this.emitMainEvent("importImagesBegin");
    const log = this.mainLogger.logChunk();
    log.log("##Import Images From Buffers");
    log.log("buffers:", buffers.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const importImage = async (buffer: Buffer, index: number) => {
      log.log("import:", index + 1, "/", buffers.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const addResult = await this.addImage({
          data: buffer, name
        });
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        } else {
          addedFileCount++;
        }
        log.log("imported", name, result);
      } catch (err) {
        log.error(err);
        result = ImportImageResult.ERROR;
      }
      this.emitMainEvent("importImagesProgress", {
        allFileCount: buffers.length,
        currentFileCount: index + 1,
        file: name,
        result: result
      });
    }
    const result =  promiseSerial(importImage, buffers);
    this.cancelImportImages = result.cancel;
    await result.value;
    this.cancelImportImages = undefined;
    log.log("return:", addedFileCount, "/", buffers.length);
    this.emitMainEvent("importImagesComplete", {
      addedFileCount: addedFileCount,
      fileCount: buffers.length
    });
    if (this.datas.dataSettings.data.autoAddTag) {
      this.emitMainEvent("updatePetaTags");
    }
    return petaImages;
  }
  /*------------------------------------
    PetaImage取得
  ------------------------------------*/
  async getPetaImage(id: string) {
    return (await this.datas.dataPetaImages.find({ id }))[0];
  }
  /*------------------------------------
    PetaImage追加
  ------------------------------------*/
  async addImage(param: { data: Buffer, name: string, fileDate?: Date, addDate?: Date }): Promise<{ exists: boolean, petaImage: PetaImage }> {
    const id = crypto.createHash("sha256").update(param.data).digest("hex");
    const exists = await this.getPetaImage(id);
    if (exists) return {
      petaImage: upgradePetaImage(exists),
      exists: true
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
    if (!extName) {
      throw new Error("invalid image file type");
    }
    const addDate = param.addDate || new Date();
    const fileDate = param.fileDate || new Date();
    const originalFileName = `${id}.${extName}`;
    const thumbnail = await this.generateThumbnail({
      data: param.data,
      outputFilePath: Path.resolve(this.paths.DIR_THUMBNAILS, originalFileName),
      size: this.datas.dataSettings.data.thumbnails.size,
      quality: this.datas.dataSettings.data.thumbnails.quality
    });
    const petaImage: PetaImage = {
      file: {
        original: originalFileName,
        thumbnail: `${originalFileName}.${thumbnail.extname}`
      },
      name: param.name,
      fileDate: fileDate.getTime(),
      addDate: addDate.getTime(),
      width: 1,
      height: thumbnail.sharp.height / thumbnail.sharp.width,
      placeholder: thumbnail.placeholder,
      id: id,
      nsfw: false
    }
    if (this.datas.dataSettings.data.autoAddTag) {
      const name = dateFormat(addDate, "yyyy-mm-dd");
      const datePetaTag = (await this.datas.dataPetaTags.find({name: name}))[0] || createPetaTag(name);
      await this.updatePetaImagePetaTag(createPetaPetaImagePetaTag(petaImage.id, datePetaTag.id), UpdateMode.UPSERT);
      await this.updatePetaTag(datePetaTag, UpdateMode.UPSERT);
    }
    await file.writeFile(Path.resolve(this.paths.DIR_IMAGES, originalFileName), param.data);
    await this.datas.dataPetaImages.update({ id: petaImage.id }, petaImage, true);
    return {
      petaImage: petaImage,
      exists: false
    };
  }
  /*------------------------------------
    サムネイル作成
  ------------------------------------*/
  async generateThumbnail(params: {
    data: Buffer,
    outputFilePath: string,
    size: number,
    quality: number
  }) {
    let result: sharp.OutputInfo;
    const extname = params.outputFilePath.split(".").pop();
    let isGIF = extname == "gif";
    if (isGIF) {
      result = await sharp(params.data)
      .resize(params.size)
      .webp({ quality: params.quality })
      .toFile(params.outputFilePath + ".gif");
      await file.writeFile(
        params.outputFilePath + ".gif",
        params.data
      );
    } else {
      result = await sharp(params.data)
      .resize(params.size)
      .webp({ quality: params.quality })
      .toFile(params.outputFilePath + ".webp");
    }
    const placeholder = await new Promise<string>((res, rej) => {
      sharp(params.data)
      .resize(PLACEHOLDER_SIZE, Math.floor(result.height / result.width * PLACEHOLDER_SIZE))
      .raw()
      .ensureAlpha()
      .toBuffer((err, buffer, { width, height }) => {
        if (err) {
          rej(err);
        }
        try {
          res(encodePlaceholder(new Uint8ClampedArray(buffer), width, height, PLACEHOLDER_COMPONENT, PLACEHOLDER_COMPONENT));
        } catch(e) {
          rej(e);
        }
      });
    })
    return {
      sharp: result,
      placeholder,
      extname: isGIF ? "gif" : "webp"
    };
  }
}