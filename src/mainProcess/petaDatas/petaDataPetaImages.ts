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
import { upgradePetaImage } from "@/mainProcess/utils/upgrader";
import sharp from "sharp";
import { imageFormatToExtention } from "@/mainProcess/utils/imageFormatToExtention";
import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";
export class PetaDataPetaImages {
  constructor(private parent: PetaDatas) {}
  private async updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaImage");
    log.log("mode:", mode);
    log.log("image:", minimId(petaImage.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaImagesPetaTags.remove({ petaImageId: petaImage.id });
      log.log("removed tags");
      await this.parent.datas.dbPetaImages.remove({ id: petaImage.id });
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
    await this.parent.datas.dbPetaImages.update(
      { id: petaImage.id },
      petaImage,
      mode === UpdateMode.UPSERT,
    );
    log.log("updated");
    return true;
  }
  public async updatePetaImages(datas: PetaImage[], mode: UpdateMode) {
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
          this.parent.emitMainEvent("updatePetaTags");
        }
        this.parent.emitMainEvent("updatePetaImages", datas, mode);
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          log: [],
          status: "complete",
        });
      },
      {},
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
    return (await this.parent.datas.dbPetaImages.find({ id }))[0];
  }
  async getPetaImages() {
    const data = await this.parent.datas.dbPetaImages.find({});
    const petaImages: PetaImages = {};
    data.forEach((pi) => {
      petaImages[pi.id] = upgradePetaImage(pi);
    });
    return petaImages;
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
      width: 1,
      height: petaMetaData.original.height / petaMetaData.original.width,
      placeholder: petaMetaData.placeholder,
      palette: petaMetaData.palette,
      id: id,
      nsfw: false,
      metadataVersion: PETAIMAGE_METADATA_VERSION,
    };
    await file.writeFile(Path.resolve(this.parent.paths.DIR_IMAGES, originalFileName), param.data);
    await this.parent.datas.dbPetaImages.update({ id: petaImage.id }, petaImage, true);
    return {
      petaImage: petaImage,
      exists: false,
    };
  }
  async regenerateMetadatas() {
    const log = this.parent.mainLogger.logChunk();
    this.parent.emitMainEvent("regenerateMetadatasBegin");
    const images = await this.parent.datas.dbPetaImages.find({});
    const generate = async (image: PetaImage, i: number) => {
      upgradePetaImage(image);
      if (image.metadataVersion >= PETAIMAGE_METADATA_VERSION) {
        return;
      }
      const data = await file.readFile(
        Path.resolve(this.parent.paths.DIR_IMAGES, image.file.original),
      );
      const result = await generateMetadata({
        data,
        outputFilePath: Path.resolve(this.parent.paths.DIR_THUMBNAILS, image.file.original),
        size: BROWSER_THUMBNAIL_SIZE,
        quality: BROWSER_THUMBNAIL_QUALITY,
      });
      image.placeholder = result.placeholder;
      image.palette = result.palette;
      image.file.thumbnail = `${image.file.original}.${result.thumbnail.format}`;
      image.metadataVersion = PETAIMAGE_METADATA_VERSION;
      await this.updatePetaImages([image], UpdateMode.UPDATE);
      log.log(`thumbnail (${i + 1} / ${images.length})`);
      this.parent.emitMainEvent("regenerateMetadatasProgress", i + 1, images.length);
    };
    await promiseSerial(generate, images).promise;
    this.parent.emitMainEvent("regenerateMetadatasComplete");
  }
}
