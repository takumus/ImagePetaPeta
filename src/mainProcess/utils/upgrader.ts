import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/commons/defines";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import DB from "@/mainProcess/storages/db";
import { v4 as uuid } from "uuid";
const defaultSettings = getDefaultSettings();
export function upgradePetaImage(petaImage: PetaImage) {
  // v0.2.0
  // if (petaImage.tags === undefined) {
  //   petaImage.tags = [];
  // }
  // v1.5.1
  if (petaImage.placeholder === undefined) {
    petaImage.placeholder = "";
  }
  // v1.6.0
  if (petaImage.nsfw === undefined) {
    petaImage.nsfw = false;
  }
  // v1.8.1
  if (petaImage.file === undefined) {
    petaImage.file = {
      original: (petaImage as any).fileName,
      thumbnail: (petaImage as any).fileName + ".webp"
    }
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
  if (settings.tileSize === undefined) {
    settings.tileSize = defaultSettings.tileSize;
  }
  if (settings.loadThumbnailsInOriginal === undefined) {
    settings.loadThumbnailsInOriginal = false;
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
  board.petaPanels.forEach((petaPanel) => {
    upgradePetaPanel(petaPanel);
  })
  return board;
}
// 1.8.0
export async function upgradePetaTag(petaTags: DB<PetaTag>, petaImages: PetaImages) {
  const petaImagesArr = Object.values(petaImages);
  let upgraded = false;
  const addTags = async (petaImage: PetaImage, index: number) => {
    const anyPetaImage = (petaImage as any);
    await promiseSerial(async (tag) => {
      const petaTag = ((await petaTags.find({ name: tag }))[0] || createPetaTag(tag)) as any;
      petaTag.petaImages.push(petaImage.id);
      petaTag.petaImages = Array.from(new Set(petaTag.petaImages));
      await petaTags.update({ id: petaTag.id }, petaTag, true);
      upgraded = true;
    },
    (anyPetaImage["tags"] || anyPetaImage["categories"] || []) as string[]).value;
    anyPetaImage["tags"] = undefined;
  }
  await promiseSerial(addTags, petaImagesArr).value;
  return upgraded;
}

// 1.8.0
export function upgradePetaPanel(petaPanel: PetaPanel) {
  if (petaPanel.gif === undefined) {
    petaPanel.gif = {
      stopped: false,
      frame: 0
    }
  }
  return petaPanel;
}

// 2.0.1
export async function upgradePetaImagesPetaTags(petaTags: DB<PetaTag>, petaImagesPetaTags: DB<PetaImagePetaTag>, petaImages: PetaImages) {
  let changed = false;
  try {
    await promiseSerial(async (petaTag) => {
      const petaImageIds = ((petaTag as any).petaImages) as string[] | undefined;
      if (!petaImageIds) {
        return;
      }
      await promiseSerial(async (petaImageId) => {
        if (!petaImages[petaImageId]) {
          return;
        }
        const pipt = createPetaPetaImagePetaTag(petaImageId, petaTag.id);
        await petaImagesPetaTags.update(
          { id: pipt.id },
          pipt,
          true
        );
        changed = true;
      }, petaImageIds).value;
      // remove petaImages property
      (petaTag as any).petaImages = undefined;
      // update
      await petaTags.update(
        { id: petaTag.id },
        petaTag,
        false
      );
    }, (await petaTags.find({}))).value;
  } catch (error) {
    //
  }
  return changed;
}