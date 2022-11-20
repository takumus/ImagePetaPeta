import { DBInfo } from "@/commons/datas/dbInfo";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { defaultStates, States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import Config from "@/main/storages/config";
import DB from "@/main/storages/db";
import { Logger, loggerKey } from "@/main/storages/logger";
import { Windows, windowsKey } from "@/main/utils/windows";
import * as file from "@/main/storages/file";
import { app, nativeTheme } from "electron";
import isValidFilePath from "@/main/utils/isValidFilePath";
import { isLatest } from "@/commons/utils/versions";
import { migrateSettings, migrateStates, migrateWindowStates } from "@/main/utils/migrater";
import * as Tasks from "@/main/tasks/task";
import { MainLogger, mainLoggerKey } from "@/main/utils/mainLogger";
import { v4 as uuid } from "uuid";
import { ErrorWindowParameters } from "@/main/errors/errorWindow";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { pathsKey, Paths } from "@/main/utils/paths";
import { provide } from "@/main/utils/di";
import {
  PetaBoardsController,
  petaBoardsControllerKey,
} from "@/main/controllers/petaBoardsController";
import {
  PetaImagesController,
  petaImagesControllerKey,
} from "@/main/controllers/petaImagesController";
import { PetaTagsController, petaTagsControllerKey } from "@/main/controllers/petaTagsController";
import {
  PetaTagPartitionsController,
  petaTagPartitionsControllerKey,
} from "@/main/controllers/petaTagPartitionsController";
import {
  dbPetaBoardsKey,
  dbPetaImagesKey,
  dbPetaImagesPetaTagsKey,
  dbPetaTagPartitionsKey,
  dbPetaTagsKey,
} from "@/main/databases";
import { emitMainEventKey } from "@/main/utils/emitMainEvent";
import { i18nKey } from "@/main/utils/i18n";
import {
  configDBInfoKey,
  configSettingsKey,
  configStatesKey,
  configWindowStatesKey,
} from "@/main/configs";
export function initDI(showError: (error: ErrorWindowParameters, quit?: boolean) => void) {
  const paths: Paths = {
    DIR_ROOT: "",
    DIR_APP: "",
    DIR_LOG: "",
    DIR_IMAGES: "",
    DIR_THUMBNAILS: "",
    DIR_TEMP: "",
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
  const mainLogger = new MainLogger();
  try {
    const i18n = createI18n({
      locale: "ja",
      messages: languages,
    });
    // ログは最優先で初期化
    paths.DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    const dataLogger = new Logger(paths.DIR_LOG);
    mainLogger.logger = dataLogger;
    // その他の初期化
    paths.DIR_APP = file.initDirectory(false, app.getPath("userData"));
    paths.DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    paths.FILE_SETTINGS = file.initFile(paths.DIR_APP, "settings.json");
    const configSettings = new Config<Settings>(
      paths.FILE_SETTINGS,
      getDefaultSettings(),
      migrateSettings,
    );
    if (configSettings.data.petaImageDirectory.default) {
      paths.DIR_ROOT = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
      configSettings.data.petaImageDirectory.path = paths.DIR_ROOT;
    } else {
      try {
        if (!isValidFilePath(configSettings.data.petaImageDirectory.path)) {
          throw new Error();
        }
        paths.DIR_ROOT = file.initDirectory(true, configSettings.data.petaImageDirectory.path);
      } catch (error) {
        configSettings.data.petaImageDirectory.default = true;
        configSettings.save();
        throw new Error(
          `Cannot access PetaImage directory: "${configSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`,
        );
      }
    }
    paths.DIR_IMAGES = file.initDirectory(true, paths.DIR_ROOT, "images");
    paths.DIR_THUMBNAILS = file.initDirectory(true, paths.DIR_ROOT, "thumbnails");
    paths.FILE_IMAGES_DB = file.initFile(paths.DIR_ROOT, "images.db");
    paths.FILE_BOARDS_DB = file.initFile(paths.DIR_ROOT, "boards.db");
    paths.FILE_TAGS_DB = file.initFile(paths.DIR_ROOT, "tags.db");
    paths.FILE_TAG_PARTITIONS_DB = file.initFile(paths.DIR_ROOT, "tag_partitions.db");
    paths.FILE_IMAGES_TAGS_DB = file.initFile(paths.DIR_ROOT, "images_tags.db");
    paths.FILE_STATES = file.initFile(paths.DIR_APP, "states.json");
    paths.FILE_DBINFO = file.initFile(paths.DIR_ROOT, "dbInfo.json");
    paths.FILE_WINDOW_STATES = file.initFile(paths.DIR_APP, "windowStates.json");
    const configDBInfo = new Config<DBInfo>(paths.FILE_DBINFO, { version: app.getVersion() });
    if (!isLatest(app.getVersion(), configDBInfo.data.version)) {
      throw new Error(
        `DB version is higher than App version. \nDB version:${
          configDBInfo.data.version
        }\nApp version:${app.getVersion()}`,
      );
    }
    const dbPetaImages = new DB<PetaImage>("petaImages", paths.FILE_IMAGES_DB);
    const dbPetaBoard = new DB<PetaBoard>("petaBoards", paths.FILE_BOARDS_DB);
    const dbPetaTags = new DB<PetaTag>("petaTags", paths.FILE_TAGS_DB);
    const dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      paths.FILE_TAG_PARTITIONS_DB,
    );
    const dbPetaImagesPetaTags = new DB<PetaImagePetaTag>(
      "petaImagePetaTag",
      paths.FILE_IMAGES_TAGS_DB,
    );
    const configStates = new Config<States>(paths.FILE_STATES, defaultStates, migrateStates);
    const configWindowStates = new Config<WindowStates>(
      paths.FILE_WINDOW_STATES,
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
    const windows = new Windows(mainLogger, configSettings, configWindowStates, isDarkMode);
    Tasks.onEmitStatus((id, status) => {
      windows.emitMainEvent("taskStatus", id, status);
    });
    provide(pathsKey, paths);
    provide(emitMainEventKey, windows.emitMainEvent.bind(windows));
    provide(loggerKey, dataLogger);
    provide(mainLoggerKey, mainLogger);
    provide(i18nKey, i18n);
    provide(windowsKey, windows);
    provide(configDBInfoKey, configDBInfo);
    provide(configSettingsKey, configSettings);
    provide(configStatesKey, configStates);
    provide(configWindowStatesKey, configWindowStates);
    provide(petaBoardsControllerKey, new PetaBoardsController());
    provide(petaImagesControllerKey, new PetaImagesController());
    provide(petaTagsControllerKey, new PetaTagsController());
    provide(petaTagPartitionsControllerKey, new PetaTagPartitionsController());
    provide(dbPetaBoardsKey, dbPetaBoard);
    provide(dbPetaImagesKey, dbPetaImages);
    provide(dbPetaImagesPetaTagsKey, dbPetaImagesPetaTags);
    provide(dbPetaTagsKey, dbPetaTags);
    provide(dbPetaTagPartitionsKey, dbPetaTagPartitions);
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
    return false;
  }
  return true;
}
