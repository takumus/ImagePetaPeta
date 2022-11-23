import { app } from "electron";

import { showError } from "@/main/errors/errorWindow";
import { migrate } from "@/main/migration";
import { useConfigDBInfo } from "@/main/provides/configs";
import {
  useDBPetaBoards,
  useDBPetaImages,
  useDBPetaImagesPetaTags,
  useDBPetaTagPartitions,
  useDBPetaTags,
} from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";

export async function initDB() {
  const logger = useLogger();
  const dbPetaBoard = useDBPetaBoards();
  const dbPetaImages = useDBPetaImages();
  const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
  const dbPetaTags = useDBPetaTags();
  const dbPetaTagPartitions = useDBPetaTagPartitions();
  const configDBInfo = useConfigDBInfo();

  try {
    // ロード
    // 時間かかったときのテスト
    // await new Promise((res) => setTimeout(res, 5000));
    await Promise.all([
      dbPetaBoard.init(),
      dbPetaImages.init(),
      dbPetaTags.init(),
      dbPetaTagPartitions.init(),
      dbPetaImagesPetaTags.init(),
    ]);
    // インデックス作成
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
  try {
    // 旧バージョンからのマイグレーション
    migrate();
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
  // 自動圧縮登録
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
