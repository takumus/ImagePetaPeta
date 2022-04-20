import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow, clipboard } from "electron";
import * as Path from "path";
import axios from "axios";
import dataURIToBuffer from "data-uri-to-buffer";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { createI18n } from "vue-i18n";
import AdmZip from "adm-zip";
import { execFile, spawn } from "child_process";
import languages from "@/commons/languages";
import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, PLACEHOLDER_COMPONENT, PLACEHOLDER_SIZE, SUPPORT_URL, UNTAGGED_ID, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import DB from "@/mainProcess/storages/db";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
import Config from "@/mainProcess/storages/config";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard, createPetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { MainEvents } from "@/commons/api/mainEvents";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { defaultStates, States } from "@/commons/datas/states";
import { upgradePetaBoard, upgradePetaImage, upgradePetaTag, upgradePetaImagesPetaTags, upgradeSettings, upgradeStates } from "@/mainProcess/utils/upgrader";
import { arrLast, minimId } from "@/commons/utils/utils";
import isValidFilePath from "@/mainProcess/utils/isValidFilePath";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { createPetaPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { MainLogger } from "./utils/mainLogger";
import { waifu2x } from "./utils/waifu2xCaffe";
import { showErrorWindow, ErrorWindowParameters } from "@/mainProcess/errors/errorWindow";
import { PetaDatas } from "./petaDatas";
(() => {
  /*------------------------------------
    シングルインスタンス化
  ------------------------------------*/
  if (!app.requestSingleInstanceLock()) {
    app.quit();
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    window, ファイルパス, DBの定義
  */
  //-------------------------------------------------------------------------------------------------//
  let window: BrowserWindow;
  let DIR_ROOT: string;
  let DIR_APP: string;
  let DIR_LOG: string;
  let DIR_IMAGES: string;
  let DIR_THUMBNAILS: string;
  let DIR_TEMP: string;
  let FILE_IMAGES_DB: string;
  let FILE_BOARDS_DB: string;
  let FILE_TAGS_DB: string;
  let FILE_IMAGES_TAGS_DB: string;
  let FILE_SETTINGS: string;
  let FILE_STATES: string;
  let dataLogger: Logger;
  let dataPetaImages: DB<PetaImage>;
  let dataPetaBoards: DB<PetaBoard>;
  let dataPetaTags: DB<PetaTag>;
  let dataPetaImagesPetaTags: DB<PetaImagePetaTag>;
  let dataSettings: Config<Settings>;
  let dataStates: Config<States>;
  let petaDatas: PetaDatas;
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const mainLogger = new MainLogger();
  //-------------------------------------------------------------------------------------------------//
  /*
    ファイルパスとDBの、検証・読み込み・作成
  */
  //-------------------------------------------------------------------------------------------------//
  try {
    // ログは最優先で初期化
    DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    dataLogger = new Logger(DIR_LOG);
    mainLogger.logger = dataLogger;
    // その他の初期化
    DIR_APP = file.initDirectory(false, app.getPath("userData"));
    DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    FILE_SETTINGS = file.initFile(DIR_APP, "settings.json");
    dataSettings = new Config<Settings>(FILE_SETTINGS, getDefaultSettings(), upgradeSettings);
    if (dataSettings.data.petaImageDirectory.default) {
      DIR_ROOT = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
      dataSettings.data.petaImageDirectory.path = DIR_ROOT;
    } else {
      try {
        if (!isValidFilePath(dataSettings.data.petaImageDirectory.path)) {
          throw new Error();
        }
        DIR_ROOT = file.initDirectory(true, dataSettings.data.petaImageDirectory.path);
      } catch (error) {
        dataSettings.data.petaImageDirectory.default = true;
        dataSettings.save();
        throw new Error(`Cannot access PetaImage directory: "${dataSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`);
      }
    }
    DIR_IMAGES = file.initDirectory(true, DIR_ROOT, "images");
    DIR_THUMBNAILS = file.initDirectory(true, DIR_ROOT, "thumbnails");
    FILE_IMAGES_DB = file.initFile(DIR_ROOT, "images.db");
    FILE_BOARDS_DB = file.initFile(DIR_ROOT, "boards.db");
    FILE_TAGS_DB = file.initFile(DIR_ROOT, "tags.db");
    FILE_IMAGES_TAGS_DB = file.initFile(DIR_ROOT, "images_tags.db");
    FILE_STATES = file.initFile(DIR_APP, "states.json");
    dataPetaImages = new DB<PetaImage>(FILE_IMAGES_DB);
    dataPetaBoards = new DB<PetaBoard>(FILE_BOARDS_DB);
    dataPetaTags = new DB<PetaTag>(FILE_TAGS_DB);
    dataPetaImagesPetaTags = new DB<PetaImagePetaTag>(FILE_IMAGES_TAGS_DB);
    dataStates = new Config<States>(FILE_STATES, defaultStates, upgradeStates);
    petaDatas = new PetaDatas(
      {
        dataPetaBoards,
        dataPetaImages,
        dataPetaImagesPetaTags,
        dataPetaTags,
        dataSettings
      }, {
        DIR_IMAGES,
        DIR_THUMBNAILS
      }, 
      emitMainEvent,
      mainLogger
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
      message: String(err)
    });
    return;
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready前にやらないといけない事
  */
  //-------------------------------------------------------------------------------------------------//
  protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: {
      secure: true,
      standard: true
    }
  }]);
  app.on("window-all-closed", () => {
    mainLogger.logChunk().log("#Electron event: window-all-closed");
    if (process.platform != "darwin") {
      app.quit();
    }
  });
  app.on("activate", async () => {
    mainLogger.logChunk().log("#Electron event: activate");
    if (BrowserWindow.getAllWindows().length === 0) {
      initWindow();
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready
  */
  //-------------------------------------------------------------------------------------------------//
  app.on("ready", async () => {
    mainLogger.logChunk().log(`\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`);
    mainLogger.logChunk().log(`verison: ${app.getVersion()}`);
    //-------------------------------------------------------------------------------------------------//
    /*
      画像用URL作成
    */
    //-------------------------------------------------------------------------------------------------//
    session.defaultSession.protocol.registerFileProtocol("image-original", async (req, res) => {
      res({
        path: Path.resolve(DIR_IMAGES, arrLast(req.url.split("/"), ""))
      });
    });
    session.defaultSession.protocol.registerFileProtocol("image-thumbnail", async (req, res) => {
      res({
        path: Path.resolve(DIR_THUMBNAILS, arrLast(req.url.split("/"), ""))
      });
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      データベースのロード
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      await dataPetaBoards.init();
      await dataPetaImages.init();
      await dataPetaTags.init();
      await dataPetaImagesPetaTags.init();
      await dataPetaTags.ensureIndex({
        fieldName: "id",
        unique: true
      });
    } catch (error) {
      showError({
        category: "M",
        code: 2,
        title: "Initialization Error",
        message: String(error)
      });
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      データのマイグレーション
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      const petaImagesArray = await dataPetaImages.find({});
      const petaImages: PetaImages = {};
      petaImagesArray.forEach((pi) => {
        petaImages[pi.id] = upgradePetaImage(pi);
      });
      if (await upgradePetaTag(dataPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade Tags");
        await promiseSerial((pi) => petaDatas.updatePetaImage(pi, UpdateMode.UPDATE), petaImagesArray).value;
      }
      if (await upgradePetaImagesPetaTags(dataPetaTags, dataPetaImagesPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade PetaImagesPetaTags");
      }
    } catch (error) {
      showError({
        category: "M",
        code: 3,
        title: "Migration Error",
        message: String(error)
      });
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      ipcへ関数を登録
    */
    //-------------------------------------------------------------------------------------------------//
    const mainFunctions = getMainFunctions();
    Object.keys(mainFunctions).forEach((key) => {
      ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      メインウインドウを初期化
    */
    //-------------------------------------------------------------------------------------------------//
    createProtocol("app");
    initWindow();
    //-------------------------------------------------------------------------------------------------//
    /*
      IPCのメインプロセス側のAPI
    */
    //-------------------------------------------------------------------------------------------------//
    function getMainFunctions():{
      [P in keyof MainFunctions]: (event: IpcMainInvokeEvent, ...args: Parameters<MainFunctions[P]>) => ReturnType<MainFunctions[P]>
    } {
      return {
        /*------------------------------------
          ウインドウを表示
        ------------------------------------*/
        showMainWindow: async () => {
          window.show();
        },
        /*------------------------------------
          画像を開く
        ------------------------------------*/
        importImageFiles: async () => {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Files");
          const result = await dialog.showOpenDialog(window, {
            properties: ["openFile", "multiSelections"]
          });
          if (result.canceled) {
            log.log("canceled");
            return 0;
          }
          log.log("return:", result.filePaths.length);
          petaDatas.importImagesFromFilePaths(result.filePaths);
          return result.filePaths.length;
        },
        /*------------------------------------
          画像を開く
        ------------------------------------*/
        importImageDirectories: async () => {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Directories");
          const result = await dialog.showOpenDialog(window, {
            properties: ["openDirectory"]
          });
          if (result.canceled) {
            log.log("canceled");
            return 0;
          }
          const filePath = result.filePaths[0];
          if (!filePath) {
            log.error("filePath is empty");
            return 0;
          }
          // log.log("return:", files.length);
          petaDatas.importImagesFromFilePaths([filePath]);
          return filePath.length;
        },
        /*------------------------------------
          URLからインポート
        ------------------------------------*/
        importImageFromURL: async (event, url) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Import Image From URL");
            let data: Buffer;
            if (url.trim().indexOf("http") != 0) {
              // dataURIだったら
              log.log("data uri");
              data = dataURIToBuffer(url);
            } else {
              // 普通のurlだったら
              log.log("normal url:", url);
              data = (await axios.get(url, { responseType: "arraybuffer" })).data;
            }
            return (await petaDatas.importImagesFromBuffers([data], "download"))[0]?.id || "";
          } catch (err) {
            log.error(err);
          }
          return "";
        },
        /*------------------------------------
          ファイルからインポート
        ------------------------------------*/
        importImagesFromFilePaths: async (event, filePaths) =>{
          const log = mainLogger.logChunk();
          try {
            log.log("#Import Images From File Paths");
            const images = (await petaDatas.importImagesFromFilePaths(filePaths)).map((image) => image.id);
            return images;
          } catch(e) {
            log.error(e);
          }
          return [];
        },
        /*------------------------------------
          クリップボードからインポート
        ------------------------------------*/
        importImagesFromClipboard: async (event, buffers) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Import Images From Clipboard");
            return (await petaDatas.importImagesFromBuffers(buffers, "clipboard")).map((petaImage) => petaImage.id);
          } catch (error) {
            log.error(error);
          }
          return [];
        },
        /*------------------------------------
          インポートのキャンセル
        ------------------------------------*/
        cancelImportImages: async () => {
          if (petaDatas.cancelImportImages) {
            petaDatas.cancelImportImages();
          }
        },
        /*------------------------------------
          全PetaImage取得
        ------------------------------------*/
        getPetaImages: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImages");
            const data = await dataPetaImages.find({});
            const petaImages: PetaImages = {};
            data.forEach((pi) => {
              petaImages[pi.id] = upgradePetaImage(pi);
            });
            log.log("return:", data.length);
            return petaImages;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImages Error",
              message: String(e)
            });
          }
          return {};
        },
        /*------------------------------------
          PetaImage 追加|更新|削除
        ------------------------------------*/
        updatePetaImages: async (event, datas, mode) => {
          const log = mainLogger.logChunk();
          log.log("#Update PetaImages");
          try {
            await promiseSerial((data) => petaDatas.updatePetaImage(data, mode), datas).value;
            if (mode == UpdateMode.REMOVE) {
              emitMainEvent("updatePetaTags");
            }
          } catch (err) {
            log.error(err);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaImages Error",
              message: String(err)
            });
          }
          if (mode != UpdateMode.UPDATE) {
            emitMainEvent("updatePetaImages");
          }
          log.log("return:", true);
          return true;
        },
        /*------------------------------------
          全PetaBoard取得
        ------------------------------------*/
        getPetaBoards: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaBoards");
            const data = await dataPetaBoards.find({});
            data.forEach((board) => {
              // バージョンアップ時のプロパティ更新
              upgradePetaBoard(board);
            })
            if (data.length == 0) {
              log.log("no boards");
              const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, dataSettings.data.darkMode);
              await petaDatas.updatePetaBoard(board, UpdateMode.UPSERT);
              data.push(board);
              log.log("return:", data.length);
              return data;
            } else {
              log.log("return:", data.length);
              return data;
            }
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaBoards Error",
              message: String(e)
            });
          }
          return [];
        },
        /*------------------------------------
          PetaBoard 追加|更新|削除
        ------------------------------------*/
        updatePetaBoards: async (event, boards, mode) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaBoards");
            await promiseSerial((board) => petaDatas.updatePetaBoard(board, mode), boards).value;
            log.log("return:", true);
            return true;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaBoards Error",
              message: String(e)
            });
          }
          return false;
        },
        /*------------------------------------
          PetaTag 追加|更新|削除
        ------------------------------------*/
        updatePetaTags: async (event, tags, mode) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaTags");
            await promiseSerial((tag) => petaDatas.updatePetaTag(tag, mode), tags).value;
            emitMainEvent("updatePetaTags");
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaTags Error",
              message: String(error)
            });
          }
          return false;
        },
        updatePetaImagesPetaTags: async (event, petaImageIds, petaTagIds, mode) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaImagesPetaTags");
            await promiseSerial(async (petaImageId) => {
              await promiseSerial(async (petaTagId) => {
                await petaDatas.updatePetaImagePetaTag(createPetaPetaImagePetaTag(petaImageId, petaTagId), mode);
              }, petaTagIds).value;
            }, petaImageIds).value;
            if (mode != UpdateMode.UPDATE) {
              emitMainEvent("updatePetaTags");
            }
            log.log("return:", true);
            return true;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaImagesPetaTags Error",
              message: String(error)
            });
          }
          return false;
        },
        getPetaImageIdsByPetaTagIds: async (event, petaTagIds) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImageIds By PetaTagIds");
            // all
            if (!petaTagIds) {
              log.log("type: all");
              const ids = (await dataPetaImages.find({})).map((pi) => pi.id);
              log.log("return:", ids.length);
              return ids;
            }
            // untagged
            if (petaTagIds.length == 0) {
              log.log("type: untagged");
              const taggedIds = Array.from(new Set((await dataPetaImagesPetaTags.find({})).map((pipt) => {
                return pipt.petaImageId;
              })));
              const ids = (await dataPetaImages.find({
                id: {
                  $nin: taggedIds
                }
              })).map((pi) => pi.id);
              log.log("return:", ids.length);
              return ids;
            }
            // filter by ids
            log.log("type: filter");
            const pipts = (await dataPetaImagesPetaTags.find({
              $or: petaTagIds.map((id) => {
                return {
                  petaTagId: id
                }
              })
            }));
            const ids = Array.from(new Set(pipts.map((pipt) => {
              return pipt.petaImageId;
            }))).filter((id) => {
              return pipts.filter((pipt) => {
                return pipt.petaImageId === id;
              }).length == petaTagIds.length
            });
            log.log("return:", ids.length);
            return ids;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImageIds By PetaTagIds Error",
              message: String(error)
            });
          }
          return [];
        },
        getPetaTagIdsByPetaImageIds: async (event, petaImageIds) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaTagIds By PetaImageIds");
            // all
            if (petaImageIds.length == 0) {
              const ids = (await dataPetaImagesPetaTags.find({})).map((pipt) => {
                return pipt.petaTagId;
              });
              log.log("type: all");
              log.log("return:", ids.length);
              return ids;
            }
            log.log("type: filter");
            // filter by ids
            // const timerUUID = uuid().substring(0, 5);
            // console.time("getPetaImageIdsByPetaTagIds-find:" + timerUUID);
            let pipts: PetaImagePetaTag[] = [];
            await promiseSerial(async (petaImageId) => {
              pipts.push(...(await dataPetaImagesPetaTags.find({ petaImageId })));
            }, petaImageIds).value;
            // console.timeEnd("getPetaImageIdsByPetaTagIds-find:" + timerUUID);
            const ids = Array.from(new Set(pipts.map((pipt) => {
              return pipt.petaTagId;
            })));
            const petaTagIds = ids.filter((id) => {
              return pipts.filter((pipt) => {
                return pipt.petaTagId == id;
              }).length == petaImageIds.length;
            });
            log.log("return:", ids.length);
            return petaTagIds;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagIds By PetaImageIds Error",
              message: String(error)
            });
          }
          return [];
        },
        getPetaTagInfos: async () => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaTagInfos");
            const petaTags = await dataPetaTags.find({});
            const taggedIds = Array.from(new Set((await dataPetaImagesPetaTags.find({})).map((pipt) => {
              return pipt.petaImageId;
            })));
            const count = (await dataPetaImages.count({
              id: {
                $nin: taggedIds
              }
            }));
            let values: PetaTagInfo[] = [];
            const result = promiseSerial(async (petaTag) => {
              const info = {
                petaTag,
                count: await dataPetaImagesPetaTags.count({ petaTagId: petaTag.id })
              } as PetaTagInfo;
              values.push(info);
              return info;
            }, petaTags);
            const values2 = await result.value;
            log.log("return:", values.length);
            values.sort((a, b) => {
              if (a.petaTag.name < b.petaTag.name) {
                return -1;
              } else {
                return 1;
              }
            });
            values.unshift({
              petaTag: {
                index: 0,
                id: UNTAGGED_ID,
                name: i18n.global.t("browser.untagged")
              },
              count: count
            })
            return values;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagInfos Error",
              message: String(error)
            });
          }
          return [];
        },
        /*------------------------------------
          ログ
        ------------------------------------*/
        log: async (event, id: string, ...args: any) => {
          dataLogger.log(LogFrom.RENDERER, id, ...args);
          return true;
        },
        /*------------------------------------
          WebブラウザでURLを開く
        ------------------------------------*/
        openURL: async (event, url) => {
          const log = mainLogger.logChunk();
          log.log("#Open URL");
          log.log("url:", url);
          shell.openExternal(url);
          return true;
        },
        /*------------------------------------
          PetaImageのファイルを開く
        ------------------------------------*/
        openImageFile: async (event, petaImage) => {
          const log = mainLogger.logChunk();
          log.log("#Open Image File");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
        },
        /*------------------------------------
          アプリ情報
        ------------------------------------*/
        getAppInfo: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get App Info");
          const info = {
            name: app.getName(),
            version: app.getVersion()
          };
          log.log("return:", info);
          return info;
        },
        /*------------------------------------
          DBフォルダを開く
        ------------------------------------*/
        showDBFolder: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Show DB Folder");
          shell.showItemInFolder(DIR_ROOT);
          return true;
        },
        /*------------------------------------
          Configフォルダを開く
        ------------------------------------*/
        showConfigFolder: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Show Config Folder");
          shell.showItemInFolder(DIR_APP);
          return true;
        },
        /*------------------------------------
          全PetaBoard取得
        ------------------------------------*/
        showImageInFolder: async (event, petaImage) => {
          const log = mainLogger.logChunk();
          log.log("#Show Image In Folder");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
          return true;
        },
        /*------------------------------------
          アップデート確認
        ------------------------------------*/
        checkUpdate: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Check Update");
            const url = `${PACKAGE_JSON_URL}?hash=${uuid()}`;
            log.log("url:", url);
            log.log("currentVersion:", app.getVersion());
            const packageJSON = (await axios.get(url, { responseType: "json" })).data;
            log.log("latestVersion:", packageJSON.version);
            return {
              current: app.getVersion(),
              latest: packageJSON.version
            }
          } catch(e) {
            log.error(e);
          }
          return {
            current: app.getVersion(),
            latest: app.getVersion()
          };
        },
        /*------------------------------------
          設定保存
        ------------------------------------*/
        updateSettings: async (event, settings) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update Settings");
            dataSettings.data = settings;
            window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
            await dataSettings.save();
            log.log("return:", dataSettings.data);
            return true;
          } catch(e) {
            log.log(e);
            showError({
              category: "M",
              code: 200,
              title: "Update Settings Error",
              message: String(e)
            });
          }
          return false;
        },
        /*------------------------------------
          設定取得
        ------------------------------------*/
        getSettings: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Settings");
          log.log("return:", dataSettings.data);
          return dataSettings.data;
        },
        /*------------------------------------
          ウインドウのフォーカス取得
        ------------------------------------*/
        getWindowIsFocused: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Window Is Focused");
          const isFocued = window.isFocused();
          log.log("return:", isFocued);
          return isFocued;
        },
        /*------------------------------------
          ズームレベル変更
        ------------------------------------*/
        setZoomLevel: async (event, level) => {
          const log = mainLogger.logChunk();
          log.log("#Set Zoom Level");
          log.log("level:", level);
          window.webContents.setZoomLevel(level);
        },
        /*------------------------------------
          最小化
        ------------------------------------*/
        windowMinimize: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Minimize");
          window.minimize();
        },
        /*------------------------------------
          最大化
        ------------------------------------*/
        windowMaximize: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Maximize");
          if (window.isMaximized()) {
            window.unmaximize();
            return;
          }
          window.maximize();
        },
        /*------------------------------------
          閉じる
        ------------------------------------*/
        windowClose: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Close");
          app.quit();
        },
        /*------------------------------------
          OS情報取得
        ------------------------------------*/
        getPlatform: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Platform");
          log.log("return:", process.platform);
          return process.platform;
        },
        /*------------------------------------
          サムネイル再生成
        ------------------------------------*/
        regenerateThumbnails: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Regenerate Thumbnails");
            log.log("preset:", dataSettings.data.thumbnails);
            emitMainEvent("regenerateThumbnailsBegin");
            const images = await dataPetaImages.find({});
            const generate = async (image: PetaImage, i: number) => {
              upgradePetaImage(image);
              const data = await file.readFile(Path.resolve(DIR_IMAGES, image.file.original));
              const result = await petaDatas.generateThumbnail({
                data,
                outputFilePath: Path.resolve(DIR_THUMBNAILS, image.file.original),
                size: dataSettings.data.thumbnails.size,
                quality: dataSettings.data.thumbnails.quality
              });
              image.placeholder = result.placeholder;
              image.file.thumbnail = `${image.file.original}.${result.extname}`;
              await petaDatas.updatePetaImage(image, UpdateMode.UPDATE);
              log.log(`thumbnail (${i + 1} / ${images.length})`);
              emitMainEvent("regenerateThumbnailsProgress", i + 1, images.length);
            }
            await promiseSerial(generate, images).value;
            emitMainEvent("regenerateThumbnailsComplete");
          } catch (err) {
            showError({
              category: "M",
              code: 200,
              title: "Regenerate Thumbnails Error",
              message: String(err)
            });
          }
        },
        /*------------------------------------
          PetaImageフォルダを選ぶ
        ------------------------------------*/
        browsePetaImageDirectory: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Browse PetaImage Directory");
          const file = await dialog.showOpenDialog(window, {
            properties: ["openDirectory"]
          });
          if (file.canceled) {
            log.log("canceled");
            return null;
          }
          const filePath = file.filePaths[0];
          if (!filePath) {
            return null;
          }
          let path = Path.resolve(filePath);
          if (Path.basename(path) != "PetaImage") {
            path = Path.resolve(path, "PetaImage");
          }
          log.log("return:", path);
          return path;
        },
        /*------------------------------------
          PetaImageフォルダを変更
        ------------------------------------*/
        changePetaImageDirectory: async (event, path) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Change PetaImage Directory");
            path = Path.resolve(path);
            if (Path.resolve() == path) {
              log.error("Invalid file path:", path);
              return false;
            }
            if (DIR_APP == path) {
              log.error("Invalid file path:", path);
              return false;
            }
            path = file.initDirectory(true, path);
            dataSettings.data.petaImageDirectory.default = false;
            dataSettings.data.petaImageDirectory.path = path;
            dataSettings.save();
            relaunch();
            return true;
          } catch(error) {
            log.error(error);
            return false;
          }
        },
        /*------------------------------------
          States
        ------------------------------------*/
        getStates: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get States");
          return dataStates.data;
        },
        /*------------------------------------
          選択中のボードのidを保存
        ------------------------------------*/
        setSelectedPetaBoard: async (event, petaBoardId: string) => {
          const log = mainLogger.logChunk();
          log.log("#Set Selected PetaBoard");
          log.log("id:", minimId(petaBoardId));
          dataStates.data.selectedPetaBoardId = petaBoardId;
          dataStates.save();
          return;
        },
        /*------------------------------------
          waifu2x
        ------------------------------------*/
        waifu2xConvert: async (event, petaImage) => {
          const log = mainLogger.logChunk();
          log.log("#Waifu2x Convert");
          const inputFile = petaDatas.getImagePath(petaImage, ImageType.ORIGINAL);
          const outputFile = `${Path.resolve(DIR_TEMP, petaImage.id)}.png`;
          const execFilePath = dataSettings.data.waifu2x.execFilePath;
          const parameters = dataSettings.data.waifu2x.parameters.map((param) => {
            if (param === "$$INPUT$$") {
              return inputFile;
            }
            if (param === "$$OUTPUT$$") {
              return outputFile;
            }
            return param;
          });
          log.log("execFilePath:", execFilePath);
          log.log("parameters:", parameters);
          const result = await waifu2x(
            Path.resolve(execFilePath),
            parameters,
            (l) => {
              log.log(l);
            }
          );
          if (result) {
            const newPetaImages = await petaDatas.importImagesFromFilePaths([outputFile]);
            if (newPetaImages.length < 1) {
              log.log("return: false");
              return false;
            }
            const newPetaImage = newPetaImages[0];
            if (!newPetaImage) {
              log.log("return: false");
              return false;
            }
            newPetaImage.addDate = petaImage.addDate;
            newPetaImage.fileDate = petaImage.fileDate;
            newPetaImage.name = petaImage.name;
            log.log("update new petaImage");
            await petaDatas.updatePetaImage(newPetaImage, UpdateMode.UPDATE);
            log.log("get tags");
            const pipts = await dataPetaImagesPetaTags.find({ petaImageId: petaImage.id });
            log.log("tags:", pipts.length);
            await promiseSerial(async (pipt, index) => {
              log.log("copy tag: (", index, "/", pipts.length, ")");
              const newPIPT = createPetaPetaImagePetaTag(newPetaImage.id, pipt.petaTagId);
              await dataPetaImagesPetaTags.update({ id: newPIPT.id }, newPIPT, true);
            }, pipts).value;
            log.log(`add "before waifu2x" tag to old petaImage`);
            const name = "before waifu2x";
            const datePetaTag = (await dataPetaTags.find({name: name}))[0] || createPetaTag(name);
            await petaDatas.updatePetaImagePetaTag(createPetaPetaImagePetaTag(petaImage.id, datePetaTag.id), UpdateMode.UPSERT);
            await petaDatas.updatePetaTag(datePetaTag, UpdateMode.UPSERT);
            emitMainEvent("updatePetaTags");
            log.log("return: true");
            return true;
          }
          log.log("return: false");
          return false;
        }
      }
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
  /*------------------------------------
    エラー表示
  ------------------------------------*/
  function showError(error: ErrorWindowParameters, quit = true) {
    try {
      mainLogger.logChunk().log("#Show Error", `code:${error.code}\ntitle: ${error.title}\nversion: ${app.getVersion()}\nmessage: ${error.message}`);
    } catch { }
    try {
      if (window && quit) {
        window.loadURL("data:text/html;charset=utf-8,");
      }
    } catch { }
    showErrorWindow(error, quit);
  }
  /*------------------------------------
    レンダラへipcで送信
  ------------------------------------*/
  function emitMainEvent<U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>): void {
    window.webContents.send(key, ...args);
  }
  /*------------------------------------
    メインウインドウ初期化
  ------------------------------------*/
  async function initWindow() {
    window = new BrowserWindow({
      width: dataStates.data.windowSize.width,
      height: dataStates.data.windowSize.height,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: Path.join(__dirname, "preload.js")
      },
      trafficLightPosition: {
        x: 13,
        y: 13
      }
    });
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      await window.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
      if (!process.env.IS_TEST) {
        window.webContents.openDevTools({ mode: "detach" });
      }
    } else {
      await window.loadURL("app://./index.html");
    }
    window.setMenuBarVisibility(false);
    // window.webContents.debugger.attach("1.1");
    // console.log(window.webContents.debugger.isAttached(), window.webContents.debugger);
    // window.webContents.debugger.on('detach', (event, reason) => {
    //   console.log('Debugger detached due to : ', reason)
    // })
    // window.webContents.debugger.on("message", (event, method, params) => {
    //   if (method == "Network.responseReceived") {
    //     console.log(params.response);
    //   }
    //   console.log(method, params);
    // })
    // window.webContents.debugger.sendCommand('Network.enable');
    if (dataStates.data.windowIsMaximized) {
      window.maximize();
    }
    window.on("close", () => {
      if (!window.isMaximized()) {
        dataStates.data.windowSize.width = window.getSize()[0] || WINDOW_DEFAULT_WIDTH;
        dataStates.data.windowSize.height = window.getSize()[1] || WINDOW_DEFAULT_HEIGHT;
      }
      dataStates.data.windowIsMaximized = window.isMaximized();
      dataStates.save();
      const log = mainLogger.logChunk();
      log.log("#Save Window Size", dataStates.data.windowSize);
    });
    window.addListener("blur", () => {
      emitMainEvent("windowFocused", false);
    });
    window.addListener("focus", () => {
      emitMainEvent("windowFocused", true);
    });
    window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
    return window;
  }
  async function downloadAndExtractUpdata(version: string) {
    const url = `https://github.com/takumus/ImagePetaPeta/releases/download/${version}/ImagePetaPeta-beta.Setup.${version}.zip`;
    const result = await axios.get(url, {
      responseType: "arraybuffer",
      onDownloadProgress: (event) => {
        console.log(event);
      }
    });
    const zipFilePath = Path.resolve(DIR_TEMP, `${version}.zip`);
    const setupFilePath = Path.resolve(DIR_TEMP, `${version}.exe`);
    await file.writeFile(zipFilePath, result.data);
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();
    const setupFile = zipEntries.find((entry) => entry.entryName === `ImagePetaPeta-beta Setup ${version}.exe`);
    if (setupFile) {
      setupFile.getDataAsync(async (data) => {
        await file.writeFile(setupFilePath, data);
        console.log("downloaded");
        spawn("powershell", [
          `start-process`, setupFilePath,
          `-verb`, `runas`
        ]);
      });
    }
  }
  /*------------------------------------
    アプリ再起動
  ------------------------------------*/
  function relaunch() {
    app.relaunch();
    app.exit();
  }
  // downloadAndExtractUpdata("2.5.0-beta");
})();