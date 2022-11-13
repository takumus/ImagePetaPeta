import { DBInfo } from "@/commons/datas/dbInfo";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { defaultStates, States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import { PetaDatas } from "@/mainProcess/petaDatas";
import Config from "@/mainProcess/storages/config";
import DB from "@/mainProcess/storages/db";
import { Logger } from "@/mainProcess/storages/logger";
import { Windows } from "@/mainProcess/utils/windows";
import * as file from "@/mainProcess/storages/file";
import { app, nativeTheme } from "electron";
import isValidFilePath from "@/mainProcess/utils/isValidFilePath";
import { isLatest } from "@/commons/utils/versions";
import { migrateSettings, migrateStates, migrateWindowStates } from "@/mainProcess/utils/migrater";
import * as Tasks from "@/mainProcess/tasks/task";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import { v4 as uuid } from "uuid";
import { ErrorWindowParameters } from "@/mainProcess/errors/errorWindow";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
export function getConstants(showError: (error: ErrorWindowParameters, quit?: boolean) => void) {
  const dirs = {
    DIR_ROOT: "",
    DIR_APP: "",
    DIR_LOG: "",
    DIR_IMAGES: "",
    DIR_THUMBNAILS: "",
    DIR_TEMP: "",
  };
  const files = {
    FILE_IMAGES_DB: "",
    FILE_BOARDS_DB: "",
    FILE_TAGS_DB: "",
    FILE_TAG_PARTITIONS_DB: "",
    FILE_IMAGES_TAGS_DB: "",
    FILE_SETTINGS: "",
    FILE_STATES: "",
    FILE_WINDOW_STATES: "",
    FILE_DBINFO: "",
  };
  let dataLogger: Logger;
  let dbPetaImages: DB<PetaImage>;
  let dbPetaBoard: DB<PetaBoard>;
  let dbPetaTags: DB<PetaTag>;
  let dbPetaTagPartitions: DB<PetaTagPartition>;
  let dbPetaImagesPetaTags: DB<PetaImagePetaTag>;
  let configDBInfo: Config<DBInfo>;
  let configSettings: Config<Settings>;
  let configStates: Config<States>;
  let configWindowStates: Config<WindowStates>;
  let petaDatas: PetaDatas;
  let windows: Windows;
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const mainLogger = new MainLogger();
  try {
    // ログは最優先で初期化
    dirs.DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    dataLogger = new Logger(dirs.DIR_LOG);
    mainLogger.logger = dataLogger;
    // その他の初期化
    dirs.DIR_APP = file.initDirectory(false, app.getPath("userData"));
    dirs.DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    files.FILE_SETTINGS = file.initFile(dirs.DIR_APP, "settings.json");
    configSettings = new Config<Settings>(
      files.FILE_SETTINGS,
      getDefaultSettings(),
      migrateSettings,
    );
    if (configSettings.data.petaImageDirectory.default) {
      dirs.DIR_ROOT = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
      configSettings.data.petaImageDirectory.path = dirs.DIR_ROOT;
    } else {
      try {
        if (!isValidFilePath(configSettings.data.petaImageDirectory.path)) {
          throw new Error();
        }
        dirs.DIR_ROOT = file.initDirectory(true, configSettings.data.petaImageDirectory.path);
      } catch (error) {
        configSettings.data.petaImageDirectory.default = true;
        configSettings.save();
        throw new Error(
          `Cannot access PetaImage directory: "${configSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`,
        );
      }
    }
    dirs.DIR_IMAGES = file.initDirectory(true, dirs.DIR_ROOT, "images");
    dirs.DIR_THUMBNAILS = file.initDirectory(true, dirs.DIR_ROOT, "thumbnails");
    files.FILE_IMAGES_DB = file.initFile(dirs.DIR_ROOT, "images.db");
    files.FILE_BOARDS_DB = file.initFile(dirs.DIR_ROOT, "boards.db");
    files.FILE_TAGS_DB = file.initFile(dirs.DIR_ROOT, "tags.db");
    files.FILE_TAG_PARTITIONS_DB = file.initFile(dirs.DIR_ROOT, "tag_partitions.db");
    files.FILE_IMAGES_TAGS_DB = file.initFile(dirs.DIR_ROOT, "images_tags.db");
    files.FILE_STATES = file.initFile(dirs.DIR_APP, "states.json");
    files.FILE_DBINFO = file.initFile(dirs.DIR_ROOT, "dbInfo.json");
    files.FILE_WINDOW_STATES = file.initFile(dirs.DIR_APP, "windowStates.json");
    configDBInfo = new Config<DBInfo>(files.FILE_DBINFO, { version: app.getVersion() });
    if (!isLatest(app.getVersion(), configDBInfo.data.version)) {
      throw new Error(
        `DB version is higher than App version. \nDB version:${
          configDBInfo.data.version
        }\nApp version:${app.getVersion()}`,
      );
    }
    dbPetaImages = new DB<PetaImage>("petaImages", files.FILE_IMAGES_DB);
    dbPetaBoard = new DB<PetaBoard>("petaBoards", files.FILE_BOARDS_DB);
    dbPetaTags = new DB<PetaTag>("petaTags", files.FILE_TAGS_DB);
    dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      files.FILE_TAG_PARTITIONS_DB,
    );
    dbPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", files.FILE_IMAGES_TAGS_DB);
    configStates = new Config<States>(files.FILE_STATES, defaultStates, migrateStates);
    configWindowStates = new Config<WindowStates>(
      files.FILE_WINDOW_STATES,
      {},
      migrateWindowStates,
    );
    (
      [
        dbPetaImages,
        dbPetaBoard,
        dbPetaTags,
        dbPetaTagPartitions,
        dbPetaImagesPetaTags,
      ] as DB<unknown>[]
    ).forEach((db) => {
      db.on("beginCompaction", () => {
        mainLogger.logChunk().log(`begin compaction(${db.name})`);
      });
      db.on("doneCompaction", () => {
        mainLogger.logChunk().log(`done compaction(${db.name})`);
      });
      db.on("compactionError", (error) => {
        mainLogger.logChunk().error(`compaction error(${db.name})`, error);
      });
    });
    const isDarkMode = () => {
      if (configSettings.data.autoDarkMode) {
        return nativeTheme.shouldUseDarkColors;
      }
      return configSettings.data.darkMode;
    };
    windows = new Windows(mainLogger, configSettings, configWindowStates, isDarkMode);
    Tasks.onEmitStatus((id, status) => {
      windows.emitMainEvent("taskStatus", id, status);
    });
    petaDatas = new PetaDatas(
      {
        dbPetaBoard,
        dbPetaImages,
        dbPetaImagesPetaTags,
        dbPetaTags,
        dbPetaTagPartitions,
        configSettings,
        i18n,
      },
      dirs,
      windows.emitMainEvent.bind(windows),
      mainLogger,
    );
  } catch (err) {
    //-------------------------------------------------------------------------------------------------//
    /*
      何らかの原因でファイルとディレクトリの準備が失敗した場合
      エラー画面を出してアプリ終了
    */
    //-------------------------------------------------------------------------------------------------//
    showError({
      category: "M",
      code: 1,
      title: "Initialization Error",
      message: String(err),
    });
    return undefined;
  }
  return {
    ...dirs,
    ...files,
    mainLogger,
    dataLogger,
    dbPetaImages,
    dbPetaBoard,
    dbPetaTags,
    dbPetaTagPartitions,
    dbPetaImagesPetaTags,
    configDBInfo,
    configSettings,
    configStates,
    configWindowStates,
    petaDatas,
    windows,
    i18n,
  };
}
