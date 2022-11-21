import { UpdateMode } from "@/commons/datas/updateMode";
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { mainLoggerKey } from "@/main/utils/mainLogger";
import * as Path from "path";
import { runExternalApplication } from "@/main/utils/runExternalApplication";
import * as Tasks from "@/main/tasks/task";
import { petaImagesControllerKey } from "@/main/controllers/petaImagesController";
import { petaTagsControllerKey } from "@/main/controllers/petaTagsController";
import { extraFiles } from "@/@assets/extraFiles";
import * as fs from "fs";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { ppa } from "@/commons/utils/pp";
import { TaskStatusCode } from "@/commons/datas/task";
import { inject } from "@/main/utils/di";
import { dbPetaImagesPetaTagsKey } from "@/main/databases";
import { pathsKey } from "@/main/utils/paths";

export async function realESRGAN(petaImages: PetaImage[], modelName: RealESRGANModelName) {
  const petaImagesController = inject(petaImagesControllerKey);
  const petaTagsController = inject(petaTagsControllerKey);
  const dbPetaImagesPetaTags = inject(dbPetaImagesPetaTagsKey);
  const paths = inject(pathsKey);
  const mainLogger = inject(mainLoggerKey);
  return Tasks.spawn(
    "realESRGAN",
    async (handler) => {
      const log = mainLogger.logChunk();
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
        status: TaskStatusCode.BEGIN,
        cancelable: true,
      });
      log.log("execFilePath:", execFilePath);
      const tasks = ppa(
        async (petaImage, index) => {
          const inputFile = petaImagesController.getImagePath(petaImage, ImageType.ORIGINAL);
          const outputFile = `${Path.resolve(paths.DIR_TEMP, petaImage.id)}.webp`;
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
              status: TaskStatusCode.PROGRESS,
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
            status: TaskStatusCode.PROGRESS,
            cancelable: true,
          });
          const result = await childProcess.promise;
          if (result) {
            const newPetaImages = await petaImagesController.importImagesFromFileInfos(
              {
                fileInfos: [{ path: outputFile }],
              },
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
            newPetaImage.addDate = petaImage.addDate + 1;
            newPetaImage.fileDate = petaImage.fileDate;
            newPetaImage.name = `${petaImage.name}(RealESRGAN-${modelName})`;
            newPetaImage.note = petaImage.note;
            newPetaImage.nsfw = petaImage.nsfw;
            log.log("update new petaImage");
            await petaImagesController.updatePetaImages([newPetaImage], UpdateMode.UPDATE, true);
            log.log("get tags");
            const pipts = await dbPetaImagesPetaTags.find({
              petaImageId: petaImage.id,
            });
            log.log("tags:", pipts.length);
            log.log("copy tags");
            await petaTagsController.updatePetaImagesPetaTags(
              [newPetaImage.id],
              pipts.map((pipt) => ({
                type: "id",
                id: pipt.petaTagId,
              })),
              UpdateMode.INSERT,
              true,
            );
          } else {
            success = false;
          }
        },
        petaImages,
        1,
      );
      await tasks.promise;
      handler.emitStatus({
        i18nKey: "tasks.upconverting",
        log: [],
        status: success ? TaskStatusCode.COMPLETE : TaskStatusCode.FAILED,
      });
      return success;
    },
    {},
    false,
  );
}