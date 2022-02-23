import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";
import { defaultSettings, Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/commons/defines";

export function upgradePetaImage(petaImage: PetaImage) {
  // v0.2.0
  if (petaImage.tags === undefined) {
    petaImage.tags = [];
  }
  // v1.5.1
  if (petaImage.placeholder === undefined) {
    petaImage.placeholder = "";
  }
  // v1.6.0
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
  if (settings.petaImageDirectory === undefined) {
    settings.petaImageDirectory = {
      default: defaultSettings.petaImageDirectory.default,
      path: defaultSettings.petaImageDirectory.path
    };
  }
  // v1.7.0
  if (settings.autoAddTag === undefined) {
    settings.autoAddTag = true;
  }
  return settings;
}
export function upgradeStates(states: States) {
  if (states.selectedPetaBoardId === undefined) {
    states.selectedPetaBoardId = "";
  } 
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