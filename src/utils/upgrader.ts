import { PetaImage } from "@/datas/petaImage";
import { defaultSettings, Settings } from "@/datas/settings";
import { States } from "@/datas/states";

export function upgradePetaImage(petaImage: PetaImage) {
  if (petaImage.placeholder === undefined) {
    petaImage.placeholder = ""; //v1.6.0
  }
  return petaImage;
}
export function upgradeSettings(settings: Settings) {
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = defaultSettings.zoomSensitivity;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = defaultSettings.moveSensitivity;
  }
  if (settings.thumbnails === undefined) {
    settings.thumbnails = {
      size: defaultSettings.thumbnails.size,
      quality: defaultSettings.thumbnails.quality
    }
  }
  if (settings.browserThumbnailSize === undefined) {
    settings.browserThumbnailSize = defaultSettings.browserThumbnailSize;
  }
  if (settings.loadThumbnailsInFullsized === undefined) {
    settings.loadThumbnailsInFullsized = false;
  }
  return settings;
}
export function upgradeStates(states: States) {
  return states;
}