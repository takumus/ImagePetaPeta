import { PetaBoard } from "@/datas/petaBoard";
import { PetaImage } from "@/datas/petaImage";
import { defaultSettings, Settings } from "@/datas/settings";
import { States } from "@/datas/states";
import { BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/defines";

export function upgradePetaImage(petaImage: PetaImage) {
  //v1.5.1
  if (petaImage.placeholder === undefined) {
    petaImage.placeholder = "";
  }
  //v1.6.0
  if (petaImage.nsfw === undefined) {
    petaImage.nsfw = false;
  }
  return petaImage;
}
export function upgradeSettings(settings: Settings) {
  // v0.8.4
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = defaultSettings.zoomSensitivity;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = defaultSettings.moveSensitivity;
  }
  // v1.4.0
  if (settings.thumbnails === undefined) {
    settings.thumbnails = {
      size: defaultSettings.thumbnails.size,
      quality: defaultSettings.thumbnails.quality
    }
  }
  // v1.5.0
  if (settings.browserThumbnailSize === undefined) {
    settings.browserThumbnailSize = defaultSettings.browserThumbnailSize;
  }
  if (settings.loadThumbnailsInFullsized === undefined) {
    settings.loadThumbnailsInFullsized = false;
  }
  // v1.6.0
  if (settings.showNsfwWithoutConfirm === undefined) {
    settings.showNsfwWithoutConfirm = false;
  }
  return settings;
}
export function upgradeStates(states: States) {
  return states;
}
export function upgradePetaBoard(board: PetaBoard) {
  // v0.5.0
  if (board.background === undefined) {
    board.background = {
      fillColor: BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      lineColor: BOARD_DEFAULT_BACKGROUND_LINE_COLOR
    }
  }
  return board;
}