import { app } from "electron";

import { PetaImages } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/datas/updateMode";

import { showError } from "@/main/errors/errorWindow";
import { useConfigDBInfo } from "@/main/provides/configs";
import { usePetaImagesController } from "@/main/provides/controllers/petaImagesController";
import {
  useDBPetaBoards,
  useDBPetaImages,
  useDBPetaImagesPetaTags,
  useDBPetaTagPartitions,
  useDBPetaTags,
} from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { migratePetaImage, migratePetaImagesPetaTags, migratePetaTag } from "@/main/utils/migrater";

export async function initDB() {
  const logger = useLogger();
  const dbPetaBoard = useDBPetaBoards();
  const dbPetaImages = useDBPetaImages();
  const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
  const dbPetaTags = useDBPetaTags();
  const dbPetaTagPartitions = useDBPetaTagPartitions();
  const configDBInfo = useConfigDBInfo();
  const petaImagesController = usePetaImagesController();
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
