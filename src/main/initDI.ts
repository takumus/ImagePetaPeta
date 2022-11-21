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
import { app } from "electron";
import isValidFilePath from "@/main/utils/isValidFilePath";
import { isLatest } from "@/commons/utils/versions";
import { migrateSettings, migrateStates, migrateWindowStates } from "@/main/utils/migrater";
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
  dbStatusKey,
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
  try {
    const i18n = createI18n({
      locale: "ja",
      messages: languages,
    });
    // ログは最優先で初期化
    const DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    const dataLogger = new Logger(DIR_LOG);
    const mainLogger = new MainLogger();
    mainLogger.logger = dataLogger;
    // その他の初期化
    const DIR_APP = file.initDirectory(false, app.getPath("userData"));
    const DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    const FILE_SETTINGS = file.initFile(DIR_APP, "settings.json");
    const configSettings = new Config<Settings>(
      FILE_SETTINGS,
      getDefaultSettings(),
      migrateSettings,
    );
    const DIR_ROOT = (() => {
      if (configSettings.data.petaImageDirectory.default) {
        const dir = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
        configSettings.data.petaImageDirectory.path = dir;
        return dir;
      } else {
        try {
          if (!isValidFilePath(configSettings.data.petaImageDirectory.path)) {
            throw new Error();
          }
          return file.initDirectory(true, configSettings.data.petaImageDirectory.path);
        } catch (error) {
          configSettings.data.petaImageDirectory.default = true;
          configSettings.save();
          throw new Error(
            `Cannot access PetaImage directory: "${configSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`,
          );
        }
      }
    })();
    const DIR_IMAGES = file.initDirectory(true, DIR_ROOT, "images");
    const DIR_THUMBNAILS = file.initDirectory(true, DIR_ROOT, "thumbnails");
    const FILE_IMAGES_DB = file.initFile(DIR_ROOT, "images.db");
    const FILE_BOARDS_DB = file.initFile(DIR_ROOT, "boards.db");
    const FILE_TAGS_DB = file.initFile(DIR_ROOT, "tags.db");
    const FILE_TAG_PARTITIONS_DB = file.initFile(DIR_ROOT, "tag_partitions.db");
    const FILE_IMAGES_TAGS_DB = file.initFile(DIR_ROOT, "images_tags.db");
    const FILE_STATES = file.initFile(DIR_APP, "states.json");
    const FILE_DBINFO = file.initFile(DIR_ROOT, "dbInfo.json");
    const FILE_WINDOW_STATES = file.initFile(DIR_APP, "windowStates.json");
    const configDBInfo = new Config<DBInfo>(FILE_DBINFO, { version: app.getVersion() });
    if (!isLatest(app.getVersion(), configDBInfo.data.version)) {
      throw new Error(
        `DB version is higher than App version. \nDB version:${
          configDBInfo.data.version
        }\nApp version:${app.getVersion()}`,
      );
    }
    const configStates = new Config<States>(FILE_STATES, defaultStates, migrateStates);
    const configWindowStates = new Config<WindowStates>(
      FILE_WINDOW_STATES,
      {},
      migrateWindowStates,
    );
    const dbPetaImages = new DB<PetaImage>("petaImages", FILE_IMAGES_DB);
    const dbPetaBoard = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    const dbPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    const dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      FILE_TAG_PARTITIONS_DB,
    );
    const dbPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", FILE_IMAGES_TAGS_DB);
    const windows = new Windows();
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
    provide(pathsKey, paths);
    provide(emitMainEventKey, windows.emitMainEvent.bind(windows));
    provide(loggerKey, dataLogger);
    provide(mainLoggerKey, mainLogger);
    provide(i18nKey, i18n);
    provide(windowsKey, windows);
    provide(dbStatusKey, { initialized: false });
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