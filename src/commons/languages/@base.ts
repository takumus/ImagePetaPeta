import { I18N, I18NProp } from "@/commons/datas/i18n";

interface TaskBase extends I18N {
  name: I18NProp;
  logs: {
    begin: I18NProp;
    complete: I18NProp;
    failed: I18NProp;
    progress: I18NProp;
  };
}
interface TasksBase extends I18N {
  [key: string]: TaskBase;
}
interface Tasks extends TasksBase {
  error: TaskBase;
  updateDatas: TaskBase;
  listingFiles: TaskBase;
  importingFiles: TaskBase;
  upconverting: TaskBase;
  searchImageByGoogle: TaskBase;
}
export interface I18NBase extends I18N {
  hello: I18NProp;
  titles: {
    details: I18NProp;
    browser: I18NProp;
    board: I18NProp;
    settings: I18NProp;
    capture: I18NProp;
    eula: I18NProp;
    quit: I18NProp;
  };
  playbackController: {
    play: I18NProp;
    pause: I18NProp;
    volume: I18NProp;
    speed: I18NProp;
  };
  commons: {
    yes: I18NProp;
    no: I18NProp;
    closeButton: I18NProp;
  };
  utils: {
    downloadUpdateDialog: I18NProp;
  };
  utilsBar: {
    nsfwConfirm: I18NProp;
  };
  home: {
    infoButton: I18NProp;
    settingsButton: I18NProp;
    importFilesFromFilesButton: I18NProp;
    importFilesFromDirectoriesButton: I18NProp;
    openBrowserButton: I18NProp;
  };
  boards: {
    removeDialog: I18NProp;
    selectErrorBoardDialog: I18NProp;
    menu: {
      openBrowser: I18NProp;
      resetPosition: I18NProp;
    };
    panelMenu: {
      toFront: I18NProp;
      toBack: I18NProp;
      details: I18NProp;
      playGIF: I18NProp;
      stopGIF: I18NProp;
      playVideo: I18NProp;
      stopVideo: I18NProp;
      crop: I18NProp;
      flipHorizontal: I18NProp;
      flipVertical: I18NProp;
      reset: I18NProp;
      remove: I18NProp;
    };
    addManyImageDialog: I18NProp;
    crop: {
      apply: I18NProp;
      reset: I18NProp;
      cancel: I18NProp;
    };
    loading: I18NProp;
    extracting: I18NProp;
  };
  browser: {
    tagMenu: {
      remove: I18NProp;
    };
    tagPartitionMenu: {
      remove: I18NProp;
    };
    addTagPartition: I18NProp;
    petaFileMenu: {
      remove: I18NProp;
      openFile: I18NProp;
      realESRGAN: I18NProp;
      searchImageByGoogle: I18NProp;
    };
    removeImageDialog: I18NProp;
    removeTagDialog: I18NProp;
    removeTagPartitionDialog: I18NProp;
    tagAlreadyExistsDialog: I18NProp;
    property: {
      clickToAddTag: I18NProp;
      tagName: I18NProp;
      fetchingTags: I18NProp;
      selectedImage: I18NProp;
      tagMenu: {
        remove: I18NProp;
      };
      clearSelectionButton: I18NProp;
      openDetailsButton: I18NProp;
      clearSelectionDialog: I18NProp;
      tags: I18NProp;
      mutualTags: I18NProp;
      infos: {
        label: I18NProp;
        addDate: I18NProp;
        fileDate: I18NProp;
        note: I18NProp;
        name: I18NProp;
        size: I18NProp;
        mimeType: I18NProp;
      };
      colors: {
        label: I18NProp;
      };
      nsfw: {
        label: I18NProp;
      };
    };
    untagged: I18NProp;
    all: I18NProp;
    grouping: I18NProp;
  };
  tab: {
    menu: {
      remove: I18NProp;
    };
  };
  info: {
    githubButton: I18NProp;
    issuesButton: I18NProp;
    dbFolderButton: I18NProp;
    configFolderButton: I18NProp;
    showEULAButton: I18NProp;
    licenses: I18NProp;
    assets: I18NProp;
    supporters: I18NProp;
  };
  settings: {
    settings: I18NProp;
    sp: I18NProp;
    general: I18NProp;
    control: I18NProp;
    browser: I18NProp;
    datas: I18NProp;
    others: I18NProp;
    info: I18NProp;
    update: I18NProp;
    darkMode: I18NProp;
    autoDarkMode: I18NProp;
    autoDarkModeDescriptions: I18NProp;
    alwaysOnTop: I18NProp;
    show: I18NProp;
    showBoard: I18NProp;
    showBrowser: I18NProp;
    showBoth: I18NProp;
    showDescriptions: I18NProp;
    alwaysOnTopDescriptions: I18NProp;
    showFPS: I18NProp;
    showFPSDescriptions: I18NProp;
    zoomSensitivity: I18NProp;
    zoomSensitivityDescriptions: I18NProp;
    moveSensitivity: I18NProp;
    moveSensitivityDescriptions: I18NProp;
    autoHideUI: I18NProp;
    autoHideUIDescriptions: I18NProp;
    regenerateMetadatasButton: I18NProp;
    regenerateMetadatasConfirm: I18NProp;
    regenerateMetadatasDescriptions: I18NProp;
    loadTilesInOriginal: I18NProp;
    loadTilesInOriginalDescriptions: I18NProp;
    showTagsOnTile: I18NProp;
    showTagsOnTileDescriptions: I18NProp;
    alwaysShowNSFW: I18NProp;
    alwaysShowNSFWDescriptions: I18NProp;
    browsePetaFileDirectoryButton: I18NProp;
    changePetaFileDirectoryButton: I18NProp;
    changePetaFileDirectoryDescriptions: I18NProp;
    updateAvailable: I18NProp;
    thisIsLatest: I18NProp;
    latestVersion: I18NProp;
    currentVersion: I18NProp;
    updateButton: I18NProp;
    checkUpdateButton: I18NProp;
    releaseNoteButton: I18NProp;
    disableAcceleratedVideoDecode: I18NProp;
    disableAcceleratedVideoDecodeDescriptions: I18NProp;
    developerMode: I18NProp;
    gamutMapSampling: I18NProp;
    gamutMapSamplingDescriptions: I18NProp;
    developerModeDescriptions: I18NProp;
    changePetaFileDirectoryDialog: I18NProp;
    changePetaFileDirectoryErrorDialog: I18NProp;
  };
  fileImporter: {
    cancel: I18NProp;
  };
  tasks: Tasks;
  eula: {
    body: I18NProp;
    agree: I18NProp;
    disagree: I18NProp;
  };
  quit: {
    quitting: I18NProp;
  };
}
