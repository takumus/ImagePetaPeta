import { app } from "electron";
import { v4 as uuid } from "uuid";
import { createI18n } from "vue-i18n";

import { DBInfo, getDefaultDBInfo } from "@/commons/datas/dbInfo";
import { Libraries } from "@/commons/datas/libraries";
import { getDefaultLibrary, Library } from "@/commons/datas/library";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { SecureFilePassword } from "@/commons/datas/secureFilePassword";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { defaultStates, States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import {
  DB_COMPACTION_RETRY_COUNT,
  DB_KILLABLE_CHECK_INTERVAL,
  DIRNAME_FEATURE_VECTORS,
  DIRNAME_IMAGES,
  DIRNAME_THUMBNAILS,
  FILENAME_BOARDS_DB,
  FILENAME_DB_INFO,
  FILENAME_IMAGES_DB,
  FILENAME_IMAGES_TAGS_DB,
  FILENAME_LIBRARIES,
  FILENAME_LIBRARY,
  FILENAME_SECURE_FILE_PASSWORD,
  FILENAME_SETTINGS,
  FILENAME_STATES,
  FILENAME_TAG_PARTITIONS_DB,
  FILENAME_TAGS_DB,
  FILENAME_WINDOW_STATES,
} from "@/commons/defines";
import languages from "@/commons/languages";

import { showError } from "@/main/errorWindow";
import { ipcFunctions } from "@/main/ipcFunctions";
import Config from "@/main/libs/config";
import DB from "@/main/libs/db";
import { provide } from "@/main/libs/di";
import { initDirectorySync, initFileSync } from "@/main/libs/file";
import { migrateSettings } from "@/main/migration/migrateSettings";
import { migrateStates } from "@/main/migration/migrateStates";
import { migrateWindowStates } from "@/main/migration/migrateWindowStates";
import {
  configDBInfoKey,
  configLibrariesKey,
  configLibraryKey,
  configSecureFilePasswordKey,
  configSettingsKey,
  configStatesKey,
  configWindowStatesKey,
} from "@/main/provides/configs";
import { ConfigSecureFilePassword } from "@/main/provides/configs/secureFilePassword";
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
  dbsKey,
  dbStatusKey,
} from "@/main/provides/databases";
import { FileImporter, fileImporterKey } from "@/main/provides/fileImporter";
import { HandleFileResponse, handleFileResponseKey } from "@/main/provides/handleFileResponse";
import { Modals, modalsKey } from "@/main/provides/modals";
import { NSFW, nsfwKey } from "@/main/provides/nsfw";
import { PageDownloaderCache, pageDownloaderCacheKey } from "@/main/provides/pageDownloaderCache";
import { Tasks, tasksKey } from "@/main/provides/tasks";
import { createSecureTempFileKey, secureTempFileKeyKey } from "@/main/provides/tempFileKey";
import { i18nKey } from "@/main/provides/utils/i18n";
import { Logger, loggerKey } from "@/main/provides/utils/logger";
import { AppPaths, appPathsKey, LibraryPaths, libraryPathsKey } from "@/main/provides/utils/paths";
import { Quit, quitKey } from "@/main/provides/utils/quit";
import { WebHook, webhookKey } from "@/main/provides/webhook";
import { Windows, windowsKey } from "@/main/provides/windows";
import { isValidPetaFilePath } from "@/main/utils/isValidFilePath";
import { isLatest } from "@/main/utils/versions";

export function initAppDI(
  dirs = {
    logs: app.getPath("logs"),
    app: app.getPath("userData"),
    temp: app.getPath("temp"),
    default: app.getPath("pictures"),
  },
) {
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const DIR_LOG = initDirectorySync(true, dirs.logs);
  const dataLogger = new Logger(DIR_LOG);
  const DIR_APP = initDirectorySync(true, dirs.app);
  const DIR_TEMP = initDirectorySync(true, dirs.temp, `imagePetaPeta-beta${uuid()}`);
  const FILE_SETTINGS = initFileSync(DIR_APP, FILENAME_SETTINGS);
  const FILE_LIBRARIES = initFileSync(DIR_APP, FILENAME_LIBRARIES);
  const FILE_STATES = initFileSync(DIR_APP, FILENAME_STATES);
  const FILE_WINDOW_STATES = initFileSync(DIR_APP, FILENAME_WINDOW_STATES);
  const FILE_SECURE_FILE_PASSWORD = initFileSync(DIR_APP, FILENAME_SECURE_FILE_PASSWORD);
  // 設定ロード
  const configSettings = new Config<Settings>(FILE_SETTINGS, getDefaultSettings(), migrateSettings);
  const configLibraries = new Config<Libraries>(FILE_LIBRARIES, {});
  const configStates = new Config<States>(FILE_STATES, defaultStates, migrateStates);
  const configWindowStates = new Config<WindowStates>(FILE_WINDOW_STATES, {}, migrateWindowStates);
  const configSecureFilePassword = new ConfigSecureFilePassword(FILE_SECURE_FILE_PASSWORD, {});
  // ルートディレクトリは試行錯誤して決定する。
  const DIR_ROOT = (() => {
    // デフォルトならピクチャーズ
    if (import.meta.env.VITE_ROOT_PATH) {
      return import.meta.env.VITE_ROOT_PATH;
    }
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
  const appPaths: AppPaths = {
    DIR_APP,
    DIR_LOG,
    DIR_TEMP,
    FILE_STATES,
    FILE_SETTINGS,
  };
  const windows = new Windows();
  provide(loggerKey, dataLogger);
  provide(appPathsKey, appPaths);
  provide(i18nKey, i18n);
  provide(dbStatusKey, { initialized: false });
  provide(configSettingsKey, configSettings);
  provide(configLibrariesKey, configLibraries);
  provide(configStatesKey, configStates);
  provide(configWindowStatesKey, configWindowStates);
  provide(secureTempFileKeyKey, createSecureTempFileKey());
  provide(configSecureFilePasswordKey, configSecureFilePassword);
  provide(quitKey, new Quit());
  provide(windowsKey, windows);
  provide(nsfwKey, new NSFW());
  return {
    DIR_ROOT,
  };
}
export function initDI(
  dirs = {
    logs: app.getPath("logs"),
    app: app.getPath("userData"),
    temp: app.getPath("temp"),
    default: app.getPath("pictures"),
  },
) {
  try {
    // その他パス初期化
    const DIR_ROOT = initAppDI(dirs).DIR_ROOT;
    // 設定ロード
    const DIR_IMAGES = initDirectorySync(true, DIR_ROOT, DIRNAME_IMAGES);
    const DIR_THUMBNAILS = initDirectorySync(true, DIR_ROOT, DIRNAME_THUMBNAILS);
    const DIR_FEATURE_VECTORS = initDirectorySync(true, DIR_ROOT, DIRNAME_FEATURE_VECTORS);
    const FILE_IMAGES_DB = initFileSync(DIR_ROOT, FILENAME_IMAGES_DB);
    const FILE_BOARDS_DB = initFileSync(DIR_ROOT, FILENAME_BOARDS_DB);
    const FILE_TAGS_DB = initFileSync(DIR_ROOT, FILENAME_TAGS_DB);
    const FILE_TAG_PARTITIONS_DB = initFileSync(DIR_ROOT, FILENAME_TAG_PARTITIONS_DB);
    const FILE_IMAGES_TAGS_DB = initFileSync(DIR_ROOT, FILENAME_IMAGES_TAGS_DB);
    const FILE_DBINFO = initFileSync(DIR_ROOT, FILENAME_DB_INFO);
    const FILE_LIBRARY = initFileSync(DIR_ROOT, FILENAME_LIBRARY);
    const configDBInfo = new Config<DBInfo>(FILE_DBINFO, getDefaultDBInfo());
    const configLibrary = new Config<Library>(FILE_LIBRARY, getDefaultLibrary());
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
    // データベース
    const dbPetaFiles = new DB<PetaFile>("petaFiles", FILE_IMAGES_DB);
    const dbPetaBoard = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    const dbPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    const dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      FILE_TAG_PARTITIONS_DB,
    );
    const dbPetaFilesPetaTags = new DB<PetaFilePetaTag>("petaFilePetaTag", FILE_IMAGES_TAGS_DB);
    const libPaths: LibraryPaths = {
      DIR_ROOT,
      DIR_IMAGES,
      DIR_THUMBNAILS,
      DIR_FEATURE_VECTORS,
      FILE_IMAGES_DB,
      FILE_BOARDS_DB,
      FILE_TAGS_DB,
      FILE_TAG_PARTITIONS_DB,
      FILE_IMAGES_TAGS_DB,
      FILE_DBINFO,
    };
    const dbs = [dbPetaBoard, dbPetaFiles, dbPetaFilesPetaTags, dbPetaTags, dbPetaTagPartitions];
    // 注入
    provide(libraryPathsKey, libPaths);
    provide(configDBInfoKey, configDBInfo);
    provide(configLibraryKey, configLibrary);
    provide(petaBoardsControllerKey, new PetaBoardsController());
    provide(petaFilesControllerKey, new PetaFilesController());
    provide(petaTagsControllerKey, new PetaTagsController());
    provide(petaFilesPetaTagsControllerKey, new PetaFilesPetaTagsController());
    provide(petaTagPartitionsControllerKey, new PetaTagPartitionsController());
    provide(fileImporterKey, new FileImporter());
    provide(dbPetaBoardsKey, dbPetaBoard);
    provide(dbPetaFilesKey, dbPetaFiles);
    provide(dbPetaFilesPetaTagsKey, dbPetaFilesPetaTags);
    provide(dbPetaTagsKey, dbPetaTags);
    provide(dbPetaTagPartitionsKey, dbPetaTagPartitions);
    provide(dbsKey, {
      dbs,
      // waitUntilKillable: () => {
      //   return new Promise<void>((res) => {
      //     let retryCount = 0;
      //     const quitIfDBsKillable = () => {
      //       const killable = dbs.reduce((killable, db) => db.isKillable && killable, true);
      //       if (killable) {
      //         res();
      //         return;
      //       } else {
      //         if (retryCount > DB_COMPACTION_RETRY_COUNT) {
      //           throw new Error("cannot compact dbs");
      //         }
      //         setTimeout(quitIfDBsKillable, DB_KILLABLE_CHECK_INTERVAL);
      //         retryCount++;
      //       }
      //     };
      //     quitIfDBsKillable();
      //   });
      // },
      waitUntilKillable: async () => {},
    });
    provide(webhookKey, new WebHook(ipcFunctions));
    provide(modalsKey, new Modals());
    provide(tasksKey, new Tasks());
    provide(pageDownloaderCacheKey, new PageDownloaderCache());
    provide(handleFileResponseKey, new HandleFileResponse());
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
