export const PROTOCOLS = {
  FILE: {
    IMAGE_ORIGINAL: "file-image-original",
    IMAGE_THUMBNAIL: "file-image-thumbnail",
    PAGE_DOWNLOADER_CACHE: "page-downloader-cache",
  },
} as const;
export const BOARD_DEFAULT_NAME: string = "noname";
export const BOARD_ADD_MULTIPLE_OFFSET_X: number = 20;
export const BOARD_ADD_MULTIPLE_OFFSET_Y: number = 20;
export const BOARD_ZOOM_MIN: number = 1 / 100; // 1%
export const BOARD_ZOOM_MAX: number = 10000 / 100; // 10000%
export const BOARD_SAVE_DELAY: number = 500;
export const BOARD_DEFAULT_IMAGE_SIZE: number = 128;
export const BOARD_ROTATION_BLOCK_INCREMENT: number = 45;

export const CLICK_OFFSET: number = 4;
export const WINDOW_DEFAULT_WIDTH: number = 1280;
export const WINDOW_DEFAULT_HEIGHT: number = 720;
export const WINDOW_SETTINGS_WIDTH: number = 520;
export const WINDOW_SETTINGS_HEIGHT: number = 520;
export const WINDOW_EULA_WIDTH: number = 520;
export const WINDOW_EULA_HEIGHT: number = 400;
export const WINDOW_MIN_WIDTH: number = 800;
export const WINDOW_MIN_HEIGHT: number = 800;
export const WINDOW_QUIT_WIDTH: number = 640;
export const WINDOW_QUIT_HEIGHT: number = 360;
export const WINDOW_MODAL_WIDTH: number = 340;
export const WINDOW_MODAL_HEIGHT: number = 160;
export const WINDOW_TASK_WIDTH: number = 640;
export const WINDOW_TASK_HEIGHT: number = 340;
export const WINDOW_MODAL_UPDATE_INTERVAL = 500;
export const BROWSER_THUMBNAIL_QUALITY: number = 100;
export const BROWSER_THUMBNAIL_SIZE: number = 256;
export const BROWSER_THUMBNAIL_ZOOM_MIN: number = 64;
export const BROWSER_THUMBNAIL_ZOOM_MAX: number = 512;
export const BROWSER_THUMBNAIL_ZOOM_STEP: number = 16;
export const BROWSER_LOAD_ORIGINAL_DELAY: number = 200;
export const BROWSER_LOAD_ORIGINAL_DELAY_RANDOM: number = 500;
export const BROWSER_LOAD_THUMBNAIL_DELAY: number = 200;
export const BROWSER_LOAD_THUMBNAIL_DELAY_RANDOM: number = 500;
export const BROWSER_FETCH_TAGS_DELAY: number = 200;
export const BROWSER_FETCH_TAGS_DELAY_RANDOM: number = 500;
export const BROWSER_THUMBNAILS_SELECTION_PERCENT: number = 0.4;
export const BROWSER_MAX_PREVIEW_COUNT: number = 30;
export const SEARCH_IMAGE_BY_GOOGLE_TIMEOUT: number = 10 * 1000;
export const UPDATE_CHECK_INTERVAL: number = 1000 * 60 * 60 * 3; // 3時間
export const IPC_GLOBAL_NAME: string = "main-process-ipc";
export const DB_COMPACTION_DELAY: number = 1000;
export const DB_COMPACTION_RETRY_COUNT: number = 10;
export const DB_KILLABLE_CHECK_INTERVAL: number = 50;
export const TASK_CLOSE_DELAY: number = 200;
export const WEBHOOK_PORT: number = 51915;
export const WEBHOOK_WHITELIST_IP_LIST: string[] = ["127.0.0.1", "::ffff:127.0.0.1", "::1"];
export const WEBHOOK_WHITELIST_ORIGIN_LIST: string[] = ["chrome-extension://"];
export const ANIMATED_GIF_DECODE_THREAD: number = 4;
export const VIDEO_LOADER_MAX_FPS: number = 60;

export const URL_PACKAGE_JSON: string = "http://18.183.141.141/ImagePetaPeta/package.json";
export const URL_DOWNLOAD: string = "https://github.com/takumus/ImagePetaPeta/releases/tag/v";
export const URL_SUPPORT: string =
  "https://docs.google.com/forms/d/e/1FAIpQLSfMVEzYwdC09SrM6ipTtHyk_wTC1n08pB2eeZIVZifIRW7ojQ/viewform";

export const FILENAME_SETTINGS: string = "settings.json";
export const FILENAME_IMAGES_DB: string = "images.db";
export const FILENAME_BOARDS_DB: string = "boards.db";
export const FILENAME_TAGS_DB: string = "tags.db";
export const FILENAME_IMAGES_TAGS_DB: string = "images_tags.db";
export const FILENAME_TAG_PARTITIONS_DB: string = "tag_partitions.db";
export const FILENAME_STATES: string = "states.json";
export const FILENAME_DB_INFO: string = "dbInfo.json";
export const FILENAME_WINDOW_STATES: string = "windowStates.json";
export const FILENAME_SECURE_FILE_PASSWORD: string = "secureFilePassword.json";
export const DIRNAME_IMAGES: string = "images";
export const DIRNAME_THUMBNAILS: string = "thumbnails";
export const DIRNAME_FEATURE_VECTORS: string = "featureVectors";

export const PETAIMAGE_METADATA_VERSION: number = 1.8;
export const CHROME_EXTENSION_VERSION: number = 1;
export const EULA: number = 2;
