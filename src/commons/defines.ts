export const PROTOCOLS = {
  FILE: {
    IMAGE_ORIGINAL: "file-image-original",
    IMAGE_THUMBNAIL: "file-image-thumbnail",
  },
  BUFFER: {
    IMAGE_ORIGINAL: "buffer-image-original",
    IMAGE_THUMBNAIL: "buffer-image-thumbnail",
  },
} as const;
export const IMG_TAG_WIDTH = 10000;
export const DEFAULT_BOARD_NAME = "noname";
export const SAVE_DELAY = 500;
export const CLICK_OFFSET = 4;
export const DEFAULT_IMAGE_SIZE = 128;
export const PACKAGE_JSON_URL = "http://18.183.141.141/ImagePetaPeta/package.json";
export const DOWNLOAD_URL = "https://github.com/takumus/ImagePetaPeta/releases/tag/v";
export const MAX_PREVIEW_COUNT = 30;
export const THUMBNAILS_SELECTION_PERCENT = 0.4;
export const BOARD_DEFAULT_BACKGROUND_FILL_COLOR = "#e9e9e9";
export const BOARD_DEFAULT_BACKGROUND_LINE_COLOR = "#666666";
export const BOARD_DARK_BACKGROUND_FILL_COLOR = "#141414";
export const BOARD_DARK_BACKGROUND_LINE_COLOR = "#444444";
export const BOARD_MAX_PETAPANEL_COUNT = 100;
export const BOARD_MAX_PETAPANEL_ADD_COUNT = 20;
export const BOARD_ADD_MULTIPLE_OFFSET_X = 20;
export const BOARD_ADD_MULTIPLE_OFFSET_Y = 20;
export const BOARD_ZOOM_MIN = 1 / 100; // 1%
export const BOARD_ZOOM_MAX = 10000 / 100; // 10000%
export const WINDOW_DEFAULT_WIDTH = 1280;
export const WINDOW_DEFAULT_HEIGHT = 720;
export const WINDOW_SETTINGS_WIDTH = 520;
export const WINDOW_SETTINGS_HEIGHT = 520;
export const WINDOW_EULA_WIDTH = 520;
export const WINDOW_EULA_HEIGHT = 400;
export const WINDOW_MIN_WIDTH = 640;
export const WINDOW_MIN_HEIGHT = 360;
export const BROWSER_THUMBNAIL_QUALITY = 100;
export const BROWSER_THUMBNAIL_SIZE = 256;
export const BROWSER_THUMBNAIL_ZOOM_MIN = 64;
export const BROWSER_THUMBNAIL_ZOOM_MAX = 512;
export const BROWSER_THUMBNAIL_ZOOM_STEP = 16;
export const BROWSER_THUMBNAIL_MARGIN = 8;
export const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 1; // 1時間
export const IPC_GLOBAL_NAME = "main-process-ipc";
export const DB_COMPACTION_DELAY = 1000;
export const ROTATION_BLOCK_INCREMENT = 45;
export const UNTAGGED_ID = "id-untagged";
export const SUPPORT_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfMVEzYwdC09SrM6ipTtHyk_wTC1n08pB2eeZIVZifIRW7ojQ/viewform";
export const PLACEHOLDER_SIZE = 32;
export const PLACEHOLDER_COMPONENT = 4;
export const BROWSER_LOAD_ORIGINAL_DELAY = 500;
export const BROWSER_LOAD_ORIGINAL_DELAY_RANDOM = 300;
export const BROWSER_LOAD_THUMBNAIL_DELAY = 200;
export const BROWSER_LOAD_THUMBNAIL_DELAY_RANDOM = 200;
export const BROWSER_FETCH_TAGS_DELAY = 200;
export const BROWSER_FETCH_TAGS_DELAY_RANDOM = 200;
export const PETAIMAGE_METADATA_VERSION = 1.7;
export const SEARCH_IMAGE_BY_GOOGLE_TIMEOUT = 10 * 1000;
export const EULA = 2;
export const TASK_CLOSE_DELAY = 200;
export const WEBHOOK_PORT = 51915;
export const WEBHOOK_WHITELIST_IP_LIST = ["127.0.0.1", "::ffff:127.0.0.1", "::1"];
export const WEBHOOK_WHITELIST_ORIGIN_LIST = ["chrome-extension://"];
export const ANIMATED_GIF_DECODE_THREAD = 4;
