import { app } from "electron";
import { v4 as uuid } from "uuid";
import { createI18n } from "vue-i18n";

import { DBInfo, getDefaultDBInfo } from "@/commons/datas/dbInfo";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { States, defaultStates } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import {
  DB_COMPACTION_RETRY_COUNT,
  DB_KILLABLE_CHECK_INTERVAL,
  DIRNAME_IMAGES,
  DIRNAME_THUMBNAILS,
  FILENAME_BOARDS_DB,
  FILENAME_DB_INFO,
  FILENAME_IMAGES_DB,
  FILENAME_IMAGES_TAGS_DB,
  FILENAME_SETTINGS,
  FILENAME_STATES,
  FILENAME_TAGS_DB,
  FILENAME_TAG_PARTITIONS_DB,
  FILENAME_WINDOW_STATES,
} from "@/commons/defines";
import languages from "@/commons/languages";

import { showError } from "@/main/errorWindow";
import Config from "@/main/libs/config";
import DB from "@/main/libs/db";
import { provide } from "@/main/libs/di";
import { initDirectorySync, initFileSync } from "@/main/libs/file";
import { migrateSettings } from "@/main/migration/migrateSettings";
import { migrateStates } from "@/main/migration/migrateStates";
import { migrateWindowStates } from "@/main/migration/migrateWindowStates";
import {
  configDBInfoKey,
  configSettingsKey,
  configStatesKey,
  configWindowStatesKey,
} from "@/main/provides/configs";
import {
  PetaBoardsController,
  petaBoardsControllerKey,
} from "@/main/provides/controllers/petaBoardsController";
import {
  PetaFilesController,
  petaFilesControllerKey,
} from "@/main/provides/controllers/petaFilesController/petaFilesController";
import {
  PetaFilesPetaTagsController,
  petaFilesPetaTagsControllerKey,
} from "@/main/provides/controllers/petaFilesPetaTagsController";
import {
  PetaTagPartitionsController,
  petaTagPartitionsControllerKey,
} from "@/main/provides/controllers/petaTagPartitionsController";
import {
  PetaTagsController,
  petaTagsControllerKey,
} from "@/main/provides/controllers/petaTagsController";
import {
  dbPetaBoardsKey,
  dbPetaFilesKey,
  dbPetaFilesPetaTagsKey,
  dbPetaTagPartitionsKey,
  dbPetaTagsKey,
  dbStatusKey,
  dbsKey,
} from "@/main/provides/databases";
import { Tasks, tasksKey } from "@/main/provides/tasks";
import { i18nKey } from "@/main/provides/utils/i18n";
import { Logger, loggerKey } from "@/main/provides/utils/logger";
import { Paths, pathsKey } from "@/main/provides/utils/paths";
import { Quit, quitKey } from "@/main/provides/utils/quit";
import { Windows, windowsKey } from "@/main/provides/windows";
import { isValidPetaFilePath } from "@/main/utils/isValidFilePath";
import { isLatest } from "@/main/utils/versions";

export function initDI(
  dirs = {
    logs: app.getPath("logs"),
    app: app.getPath("userData"),
    temp: app.getPath("temp"),
    default: app.getPath("pictures"),
  },
) {
  try {
    const i18n = createI18n({
      locale: "ja",
      messages: languages,
    });
    // ログは最優先で初期化
    const DIR_LOG = initDirectorySync(true, dirs.logs);
    const dataLogger = new Logger(DIR_LOG);
    // その他パス初期化
    const DIR_APP = initDirectorySync(true, dirs.app);
    const DIR_TEMP = initDirectorySync(true, dirs.temp, `imagePetaPeta-beta${uuid()}`);
    const FILE_SETTINGS = initFileSync(DIR_APP, FILENAME_SETTINGS);
    // 設定ロード
    const configSettings = new Config<Settings>(
      FILE_SETTINGS,
      getDefaultSettings(),
      migrateSettings,
    );
    // ルートディレクトリは試行錯誤して決定する。
    const DIR_ROOT = (() => {
      // デフォルトならピクチャーズ
      if (configSettings.data.petaFileDirectory.default) {
        return (configSettings.data.petaFileDirectory.path = initDirectorySync(
          true,
          dirs.default,
          "imagePetaPeta",
        ));
      } else {
        // ちがうなら設定ファイルパス
        try {
          if (!isValidPetaFilePath(configSettings.data.petaFileDirectory.path)) {
            throw new Error();
          }
          return initDirectorySync(true, configSettings.data.petaFileDirectory.path);
        } catch (error) {
          configSettings.data.petaFileDirectory.default = true;
          configSettings.save();
          throw new Error(
            `Cannot access PetaFile directory: "${configSettings.data.petaFileDirectory.path}"\nChanged to default directory. Please restart application.`,
          );
        }
      }
    })();
    const DIR_IMAGES = initDirectorySync(true, DIR_ROOT, DIRNAME_IMAGES);
    const DIR_THUMBNAILS = initDirectorySync(true, DIR_ROOT, DIRNAME_THUMBNAILS);
    const FILE_IMAGES_DB = initFileSync(DIR_ROOT, FILENAME_IMAGES_DB);
    const FILE_BOARDS_DB = initFileSync(DIR_ROOT, FILENAME_BOARDS_DB);
    const FILE_TAGS_DB = initFileSync(DIR_ROOT, FILENAME_TAGS_DB);
    const FILE_TAG_PARTITIONS_DB = initFileSync(DIR_ROOT, FILENAME_TAG_PARTITIONS_DB);
    const FILE_IMAGES_TAGS_DB = initFileSync(DIR_ROOT, FILENAME_IMAGES_TAGS_DB);
    const FILE_STATES = initFileSync(DIR_APP, FILENAME_STATES);
    const FILE_DBINFO = initFileSync(DIR_ROOT, FILENAME_DB_INFO);
    const FILE_WINDOW_STATES = initFileSync(DIR_APP, FILENAME_WINDOW_STATES);
    const configDBInfo = new Config<DBInfo>(FILE_DBINFO, getDefaultDBInfo());
    // デフォルト値だったらバージョン付与。
    if (configDBInfo.data.version === getDefaultDBInfo().version) {
      configDBInfo.data.version = app.getVersion();
      configDBInfo.save();
    }
    // データベースバージョンを読んで、アプリのバージョンよりも高かったらダメ
    if (!isLatest(app.getVersion(), configDBInfo.data.version)) {
      throw new Error(
        `DB version is higher than App version. \nDB version:${
          configDBInfo.data.version
        }\nApp version:${app.getVersion()}`,
      );
    }
    // コンフィグ
    const configStates = new Config<States>(FILE_STATES, defaultStates, migrateStates);
    const configWindowStates = new Config<WindowStates>(
      FILE_WINDOW_STATES,
      {},
      migrateWindowStates,
    );
    // データベース
    const dbPetaFiles = new DB<PetaFile>("petaFiles", FILE_IMAGES_DB);
    const dbPetaBoard = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    const dbPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    const dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      FILE_TAG_PARTITIONS_DB,
    );
    const dbPetaFilesPetaTags = new DB<PetaFilePetaTag>("petaFilePetaTag", FILE_IMAGES_TAGS_DB);
    const tasks = new Tasks();
    // 画面初期化
    const windows = new Windows();
    // パスまとめ
    const paths: Paths = {
      DIR_ROOT,
      DIR_APP,
      DIR_LOG,
      DIR_IMAGES,
      DIR_THUMBNAILS,
      DIR_TEMP,
      FILE_IMAGES_DB,
      FILE_BOARDS_DB,
      FILE_TAGS_DB,
      FILE_TAG_PARTITIONS_DB,
      FILE_IMAGES_TAGS_DB,
      FILE_SETTINGS,
      FILE_STATES,
      FILE_WINDOW_STATES,
      FILE_DBINFO,
    };
    const dbs = [dbPetaBoard, dbPetaFiles, dbPetaFilesPetaTags, dbPetaTags, dbPetaTagPartitions];
    // 注入
    provide(pathsKey, paths);
    provide(loggerKey, dataLogger);
    provide(i18nKey, i18n);
    provide(quitKey, new Quit());
    provide(windowsKey, windows);
    provide(dbStatusKey, { initialized: false });
    provide(configDBInfoKey, configDBInfo);
    provide(configSettingsKey, configSettings);
    provide(configStatesKey, configStates);
    provide(configWindowStatesKey, configWindowStates);
    provide(petaBoardsControllerKey, new PetaBoardsController());
    provide(petaFilesControllerKey, new PetaFilesController());
    provide(petaTagsControllerKey, new PetaTagsController());
    provide(petaFilesPetaTagsControllerKey, new PetaFilesPetaTagsController());
    provide(petaTagPartitionsControllerKey, new PetaTagPartitionsController());
    provide(dbPetaBoardsKey, dbPetaBoard);
    provide(dbPetaFilesKey, dbPetaFiles);
    provide(dbPetaFilesPetaTagsKey, dbPetaFilesPetaTags);
    provide(dbPetaTagsKey, dbPetaTags);
    provide(dbPetaTagPartitionsKey, dbPetaTagPartitions);
    provide(dbsKey, {
      dbs,
      waitUntilKillable: () => {
        return new Promise<void>((res) => {
          let retryCount = 0;
          const quitIfDBsKillable = () => {
            const killable = dbs.reduce((killable, db) => db.isKillable && killable, true);
            if (killable) {
              res();
              return;
            } else {
              if (retryCount > DB_COMPACTION_RETRY_COUNT) {
                throw new Error("cannot compact dbs");
              }
              setTimeout(quitIfDBsKillable, DB_KILLABLE_CHECK_INTERVAL);
              retryCount++;
            }
          };
          quitIfDBsKillable();
        });
      },
    });
    provide(tasksKey, tasks);
  } catch (err) {
    // どこかで失敗したら強制終了
    console.log(err, app);
    showError({
      category: "M",
      code: 1,
      title: "Initialization Error",
      message: String(err),
    });
    return false;
  }
  return true;
}
