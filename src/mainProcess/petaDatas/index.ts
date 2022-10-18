import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import * as Path from "path";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import DB from "@/mainProcess/storages/db";
import { MainEvents } from "@/commons/api/mainEvents";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Settings } from "@/commons/datas/settings";
import Config from "@/mainProcess/storages/config";
import { runExternalApplication } from "@/mainProcess/utils/runExternalApplication";
import * as Tasks from "@/mainProcess/tasks/task";
import { PetaDataPetaImages } from "@/mainProcess/petaDatas/petaDataPetaImages";
import { PetaDataPetaBoards } from "@/mainProcess/petaDatas/petaDataPetaBoards";
import { PetaDataPetaTags } from "@/mainProcess/petaDatas/petaDataPetaTags";
import { I18n } from "vue-i18n";
import languages from "@/commons/languages";
import { DateTimeFormat, NumberFormat } from "@intlify/core-base";
import { extraFiles } from "@/@assets/extraFiles";
import * as fs from "fs";
import { resolveExtraFilesPath } from "@/mainProcess/utils/resolveExtraFilesPath";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
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
      i18n: I18n<typeof languages, DateTimeFormat, NumberFormat, string, true>;
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
  async realESRGAN(petaImages: PetaImage[], modelName: RealESRGANModelName) {
    return Tasks.spawn(
      "realESRGAN",
      async (handler) => {
        const log = this.mainLogger.logChunk();
        const isMac = process.platform === "darwin";
        const execFilePath = resolveExtraFilesPath(
          isMac
            ? extraFiles["realesrgan.darwin"]["realesrgan-ncnn-vulkan"]
            : extraFiles["realesrgan.win32"]["realesrgan-ncnn-vulkan.exe"],
        );
        const modelFilePath = resolveExtraFilesPath(
          isMac
            ? extraFiles["realesrgan.darwin"]["models/"]
            : extraFiles["realesrgan.win32"]["models/"],
        );
        if (isMac) {
          try {
            fs.accessSync(execFilePath, fs.constants.X_OK);
          } catch {
            fs.chmodSync(execFilePath, "755");
          }
        }
        let success = true;
        handler.emitStatus({
          i18nKey: "tasks.upconverting",
          log: [petaImages.length.toString()],
          status: "begin",
          cancelable: true,
        });
        log.log("execFilePath:", execFilePath);
        const tasks = promiseSerial(async (petaImage, index) => {
          const inputFile = this.petaImages.getImagePath(petaImage, ImageType.ORIGINAL);
          const outputFile = `${Path.resolve(this.paths.DIR_TEMP, petaImage.id)}.webp`;
          const parameters = [
            "-i",
            inputFile,
            "-o",
            outputFile,
            "-m",
            modelFilePath,
            "-n",
            modelName,
          ];
          let percent = 0;
          const childProcess = runExternalApplication(execFilePath, parameters, "utf8", (l) => {
            l = l.trim();
            percent = /^\d+\.\d+%$/.test(l) ? Number(l.replace(/%/, "")) : percent;
            log.log(l);
            handler.emitStatus({
              i18nKey: "tasks.upconverting",
              progress: {
                all: petaImages.length,
                current: index + percent / 100,
              },
              log: [l],
              status: "progress",
              cancelable: true,
            });
          });
          handler.onCancel = () => {
            childProcess.kill();
            tasks.cancel();
          };
          handler.emitStatus({
            i18nKey: "tasks.upconverting",
            progress: {
              all: petaImages.length,
              current: index,
            },
            log: [[execFilePath, ...parameters].join(" ")],
            status: "progress",
            cancelable: true,
          });
          const result = await childProcess.promise;
          if (result) {
            const newPetaImages = await this.petaImages.importImagesFromFilePaths(
              [outputFile],
              true,
            );
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
            await this.petaImages.updatePetaImages([newPetaImage], UpdateMode.UPDATE, true);
            this.emitMainEvent("updatePetaImages", [newPetaImage], UpdateMode.UPDATE);
            log.log("get tags");
            const pipts = await this.datas.dbPetaImagesPetaTags.find({ petaImageId: petaImage.id });
            log.log("tags:", pipts.length);
            log.log("copy tags");
            await this.petaTags.updatePetaImagesPetaTags(
              [newPetaImage.id],
              pipts.map((pipt) => pipt.petaTagId),
              UpdateMode.INSERT,
              true,
            );
            log.log(`add "before realESRGAN" tag to old petaImage`);
            const name = "before realESRGAN";
            let petaTag = (await this.datas.dbPetaTags.find({ name: name }))[0];
            if (petaTag === undefined) {
              petaTag = createPetaTag(name);
              await this.petaTags.updatePetaTags([petaTag], UpdateMode.INSERT);
            }
            await this.petaTags.updatePetaImagesPetaTags(
              [petaImage.id],
              [petaTag.id],
              UpdateMode.INSERT,
              true,
            );
          } else {
            success = false;
          }
        }, petaImages);
        await tasks.promise;
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
}
