import { app } from "electron";

import { showError } from "@/main/errorWindow";
import { migrate } from "@/main/migration";
import { useConfigDBInfo } from "@/main/provides/configs";
import {
  useDBPetaBoards,
  useDBPetaFiles,
  useDBPetaFilesPetaTags,
  useDBPetaTagPartitions,
  useDBPetaTags,
  useDBStatus,
} from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { useWindows } from "@/main/provides/windows";

export async function initDB() {
  const initLog = useLogger().logMainChunk("initDB");
  const dbPetaBoard = useDBPetaBoards();
  const dbPetaFiles = useDBPetaFiles();
  const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
  const dbPetaTags = useDBPetaTags();
  const dbPetaTagPartitions = useDBPetaTagPartitions();
  const configDBInfo = useConfigDBInfo();
  const dbStatus = useDBStatus();
  const windows = useWindows();
  const dbs = [
    dbPetaBoard,
    dbPetaFiles,
    dbPetaTags,
    dbPetaTagPartitions,
    dbPetaFilesPetaTags,
  ] as const;
  function emitInitialization(l: string) {
    windows.emit.initialization.progress({ type: "all" }, l);
    initLog.debug("$Init DB:", l);
  }
  try {
    // ロード
    await Promise.all(
      dbs.map((db) => {
        return (async () => {
          await db.init();
          emitInitialization(`initialize: ${db.name}`);
        })();
      }),
    );
    // インデックス作成
    await Promise.all(
      dbs.map((db) => {
        return (async () => {
          await db.ensureIndex({
            fieldName: "id",
            unique: true,
          }),
            emitInitialization(`ensure index: ${db.name}`);
        })();
      }),
    );
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
    const migrationLog = useLogger().logMainChunk("migrationDB");
    // 旧バージョンからのマイグレーション
    await migrate((l: string) => {
      emitInitialization(`migrate: ${l}`);
      migrationLog.debug(l);
    });
    // バージョンアップ時、バージョン情報更新
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
  const compactionLog = useLogger().logMainChunk("compactionDB");
  dbs.forEach((db) => {
    db.on("beginCompaction", () => {
      compactionLog.debug(`begin compaction(${db.name})`);
    });
    db.on("doneCompaction", () => {
      compactionLog.debug(`done compaction(${db.name})`);
    });
    db.on("compactionError", (error) => {
      compactionLog.error(`compaction error(${db.name})`, error);
    });
  });
  // DB初期化完了通知
  dbStatus.initialized = true;
  windows.emit.initialization.complete({ type: "all" });
}
