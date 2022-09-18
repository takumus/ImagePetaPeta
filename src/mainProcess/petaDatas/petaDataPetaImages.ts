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
import { generateMetadataByWorker } from "@/mainProcess/utils/generateMetadataByWorker";
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
  async regenerateMetadatas() {
    const log = this.parent.mainLogger.logChunk();
    this.parent.emitMainEvent("regenerateMetadatasBegin");
    const images = await this.parent.datas.dbPetaImages.find({});
    let completed = 0;
    const generate = async (image: PetaImage) => {
      upgradePetaImage(image);
      // if (image.metadataVersion >= PETAIMAGE_METADATA_VERSION) {
      //   return;
      // }
      const data = await file.readFile(
        Path.resolve(this.parent.paths.DIR_IMAGES, image.file.original),
      );
      await generateMetadataByWorker(
        {
          data,
          outputFilePath: Path.resolve(this.parent.paths.DIR_THUMBNAILS, image.file.original),
          size: BROWSER_THUMBNAIL_SIZE,
          quality: BROWSER_THUMBNAIL_QUALITY,
        },
        async (result) => {
          image.placeholder = result.placeholder;
          image.palette = result.palette;
          image.width = result.original.width;
          image.height = result.original.height;
          image.file.thumbnail = `${image.file.original}.${result.thumbnail.format}`;
          image.metadataVersion = PETAIMAGE_METADATA_VERSION;
          await this.updatePetaImages([image], UpdateMode.UPDATE, true);
        },
      );
      log.log(`thumbnail (${++completed} / ${images.length})`);
      this.parent.emitMainEvent("regenerateMetadatasProgress", completed, images.length);
    };
    await Promise.all(images.map((image) => generate(image)));
    this.parent.emitMainEvent("regenerateMetadatasComplete");
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
}
