import { Vec2 } from "./utils/vec2";

export const IMG_TAG_WIDTH = 10000;
export const DEFAULT_BOARD_NAME = "noname";
export const SAVE_DELAY = 500;
export const CLICK_OFFSET = 20;
export const UNTAGGED_TAG_NAME = "Untagged";
export const DEFAULT_IMAGE_SIZE = 200;
export const PACKAGE_JSON_URL = "https://raw.githubusercontent.com/takumus/ImagePetaPeta/main/package.json";
export const DOWNLOAD_URL = "https://github.com/takumus/ImagePetaPeta/releases/tag/";
export const MAX_PREVIEW_COUNT = 100;
export const THUMBNAILS_SELECTION_PERCENT = 0.4;
export const BOARD_DEFAULT_BACKGROUND_FILL_COLOR = "#ffffff";
export const BOARD_DEFAULT_BACKGROUND_LINE_COLOR = "#cccccc";
export const BOARD_DARK_BACKGROUND_FILL_COLOR = "#222222";
export const BOARD_DARK_BACKGROUND_LINE_COLOR = "#444444";
export const BOARD_MAX_PETAPANEL_COUNT = 100;
export const BOARD_MAX_PETAPANEL_ADD_COUNT = 20;
export const BOARD_ADD_MULTIPLE_OFFSET = new Vec2(20, 20);
export const BOARD_ZOOM_MIN = 1 / 100;     // 1%
export const BOARD_ZOOM_MAX = 5000 / 100; // 5000%