import { app } from "electron";
import { UpdateMode } from "@/commons/datas/updateMode";
import { migratePetaImage, migratePetaTag, migratePetaImagesPetaTags } from "@/main/utils/migrater";
import { loggerKey } from "@/main/provides/utils/logger";
import { inject } from "@/main/utils/di";
import { petaImagesControllerKey } from "@/main/provides/controllers/petaImagesController";
import {
  dbPetaBoardsKey,
  dbPetaImagesKey,
  dbPetaImagesPetaTagsKey,
  dbPetaTagPartitionsKey,
  dbPetaTagsKey,
} from "@/main/provides/databases";
import { configDBInfoKey } from "@/main/provides/configs";
import { showError } from "@/main/errors/errorWindow";
import { PetaImages } from "@/commons/datas/petaImage";

export async function initDB() {
  const logger = inject(loggerKey);
  const dbPetaBoard = inject(dbPetaBoardsKey);
  const dbPetaImages = inject(dbPetaImagesKey);
  const dbPetaImagesPetaTags = inject(dbPetaImagesPetaTagsKey);
  const dbPetaTags = inject(dbPetaTagsKey);
  const dbPetaTagPartitions = inject(dbPetaTagPartitionsKey);
  const configDBInfo = inject(configDBInfoKey);
  const petaImagesController = inject(petaImagesControllerKey);
  //-------------------------------------------------------------------------------------------------//
  /*
    ロード
  */
  //-------------------------------------------------------------------------------------------------//
  try {
    // 時間かかったときのテスト
    // await new Promise((res) => setTimeout(res, 5000));
    await Promise.all([
      dbPetaBoard.init(),
      dbPetaImages.init(),
      dbPetaTags.init(),
      dbPetaTagPartitions.init(),
      dbPetaImagesPetaTags.init(),
    ]);
    await Promise.all([
      dbPetaTags.ensureIndex({
        fieldName: "id",
        unique: true,
      }),
      dbPetaImages.ensureIndex({
        fieldName: "id",
        unique: true,
      }),
      dbPetaTagPartitions.ensureIndex({
        fieldName: "id",
        unique: true,
      }),
      dbPetaImagesPetaTags.ensureIndex({
        fieldName: "id",
        unique: true,
      }),
    ]);
  } catch (error) {
    showError({
      category: "M",
      code: 2,
      title: "Initialization Error",
      message: String(error),
    });
    return;
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    マイグレーション
  */
  //-------------------------------------------------------------------------------------------------//
  try {
    const petaImagesArray = dbPetaImages.getAll();
    const petaImages: PetaImages = {};
    petaImagesArray.forEach((pi) => {
      petaImages[pi.id] = pi;
      if (migratePetaImage(pi)) {
        logger.logMainChunk().log("Migrate PetaImage");
        petaImagesController.updatePetaImages([pi], UpdateMode.UPDATE, true);
      }
    });
    if (await migratePetaTag(dbPetaTags, petaImages)) {
      logger.logMainChunk().log("Migrate PetaTags");
      await petaImagesController.updatePetaImages(petaImagesArray, UpdateMode.UPDATE, true);
    }
    if (await migratePetaImagesPetaTags(dbPetaTags, dbPetaImagesPetaTags, petaImages)) {
      logger.logMainChunk().log("Migrate PetaImagesPetaTags");
    }
    if (configDBInfo.data.version !== app.getVersion()) {
      configDBInfo.data.version = app.getVersion();
      configDBInfo.save();
    }
  } catch (error) {
    showError({
      category: "M",
      code: 3,
      title: "Migration Error",
      message: String(error),
    });
    return;
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    自動圧縮
  */
  //-------------------------------------------------------------------------------------------------//
  (
    [dbPetaImages, dbPetaBoard, dbPetaTags, dbPetaTagPartitions, dbPetaImagesPetaTags] as const
  ).forEach((db) => {
    db.on("beginCompaction", () => {
      logger.logMainChunk().log(`begin compaction(${db.name})`);
    });
    db.on("doneCompaction", () => {
      logger.logMainChunk().log(`done compaction(${db.name})`);
    });
    db.on("compactionError", (error) => {
      logger.logMainChunk().error(`compaction error(${db.name})`, error);
    });
  });
}
