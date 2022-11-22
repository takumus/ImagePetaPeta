import { app } from "electron";
import { v4 as uuid } from "uuid";
import { createI18n } from "vue-i18n";

import { DBInfo } from "@/commons/datas/dbInfo";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { States, defaultStates } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import {
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

import { ErrorWindowParameters } from "@/main/errors/errorWindow";
import Config from "@/main/libs/config";
import DB from "@/main/libs/db";
import { provide } from "@/main/libs/di";
import * as file from "@/main/libs/file";
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
  PetaImagesController,
  petaImagesControllerKey,
} from "@/main/provides/controllers/petaImagesController";
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
  dbPetaImagesKey,
  dbPetaImagesPetaTagsKey,
  dbPetaTagPartitionsKey,
  dbPetaTagsKey,
  dbStatusKey,
} from "@/main/provides/databases";
import { i18nKey } from "@/main/provides/utils/i18n";
import { Logger, loggerKey } from "@/main/provides/utils/logger";
import { Paths, pathsKey } from "@/main/provides/utils/paths";
import { Windows, windowsKey } from "@/main/provides/utils/windows";
import isValidFilePath from "@/main/utils/isValidFilePath";
import { migrateSettings, migrateStates, migrateWindowStates } from "@/main/utils/migrater";
import { isLatest } from "@/main/utils/versions";

export function initDI(showError: (error: ErrorWindowParameters, quit?: boolean) => void) {
  try {
    const i18n = createI18n({
      locale: "ja",
      messages: languages,
    });
    // ログは最優先で初期化
    const DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    const dataLogger = new Logger(DIR_LOG);
    // その他パス初期化
    const DIR_APP = file.initDirectory(false, app.getPath("userData"));
    const DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    const FILE_SETTINGS = file.initFile(DIR_APP, FILENAME_SETTINGS);
    // 設定ロード
    const configSettings = new Config<Settings>(
      FILE_SETTINGS,
      getDefaultSettings(),
      migrateSettings,
    );
    // ルートディレクトリは試行錯誤して決定する。
    const DIR_ROOT = (() => {
      // デフォルトならピクチャーズ
      if (configSettings.data.petaImageDirectory.default) {
        const dir = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
        configSettings.data.petaImageDirectory.path = dir;
        return dir;
      } else {
        // ちがうなら設定ファイルパス
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
    const DIR_IMAGES = file.initDirectory(true, DIR_ROOT, DIRNAME_IMAGES);
    const DIR_THUMBNAILS = file.initDirectory(true, DIR_ROOT, DIRNAME_THUMBNAILS);
    const FILE_IMAGES_DB = file.initFile(DIR_ROOT, FILENAME_IMAGES_DB);
    const FILE_BOARDS_DB = file.initFile(DIR_ROOT, FILENAME_BOARDS_DB);
    const FILE_TAGS_DB = file.initFile(DIR_ROOT, FILENAME_TAGS_DB);
    const FILE_TAG_PARTITIONS_DB = file.initFile(DIR_ROOT, FILENAME_TAG_PARTITIONS_DB);
    const FILE_IMAGES_TAGS_DB = file.initFile(DIR_ROOT, FILENAME_IMAGES_TAGS_DB);
    const FILE_STATES = file.initFile(DIR_APP, FILENAME_STATES);
    const FILE_DBINFO = file.initFile(DIR_ROOT, FILENAME_DB_INFO);
    const FILE_WINDOW_STATES = file.initFile(DIR_APP, FILENAME_WINDOW_STATES);
    // データベースバージョンを読んで、アプリのバージョンよりも高かったらダメ
    const configDBInfo = new Config<DBInfo>(FILE_DBINFO, { version: app.getVersion() });
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
    const dbPetaImages = new DB<PetaImage>("petaImages", FILE_IMAGES_DB);
    const dbPetaBoard = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    const dbPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    const dbPetaTagPartitions = new DB<PetaTagPartition>(
      "petaTagPartitions",
      FILE_TAG_PARTITIONS_DB,
    );
    const dbPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", FILE_IMAGES_TAGS_DB);
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
    // 注入
    provide(pathsKey, paths);
    provide(loggerKey, dataLogger);
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
    // どこかで失敗したら強制終了
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
