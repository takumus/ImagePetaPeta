import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PetaTag } from "@/commons/datas/petaTag";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { defaultStates, States } from "@/commons/datas/states";
import { BOARD_DEFAULT_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_LINE_COLOR } from "@/commons/defines";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import DB from "@/mainProcess/storages/db";
import deepcopy from "deepcopy";
import { v4 as uuid } from "uuid";
const defaultSettings = getDefaultSettings();
export function upgradePetaImage(petaImage: PetaImage) {
  // v0.2.0 (move to PetaImagePetaTag)
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
  // v2.6.0
  if (petaImage.palette === undefined) {
    petaImage.palette = [];
  }
  return petaImage;
}
export function upgradeSettings(settings: Settings) {
  let changed = false;
  // v0.8.4
  if (settings.zoomSensitivity === undefined) {
    settings.zoomSensitivity = defaultSettings.zoomSensitivity;
    changed = true;
  }
  if (settings.moveSensitivity === undefined) {
    settings.moveSensitivity = defaultSettings.moveSensitivity;
    changed = true;
  }
  // // v1.5.0 (move to states v2.6.0)
  // if (settings.tileSize === undefined) {
  //   settings.tileSize = defaultSettings.tileSize;
  //   changed = true;
  // }
  if (settings.loadThumbnailsInOriginal === undefined) {
    settings.loadThumbnailsInOriginal = defaultSettings.loadThumbnailsInOriginal;
    changed = true;
  }
  // v1.6.0
  if (settings.alwaysShowNSFW === undefined) {
    settings.alwaysShowNSFW = defaultSettings.alwaysShowNSFW;
    changed = true;
  }
  if (settings.petaImageDirectory === undefined) {
    settings.petaImageDirectory = {
      default: defaultSettings.petaImageDirectory.default,
      path: defaultSettings.petaImageDirectory.path
    };
    changed = true;
  }
  // v1.7.0
  if (settings.autoAddTag === undefined) {
    settings.autoAddTag = defaultSettings.autoAddTag;
    changed = true;
  }
  // v2.4.0
  if (settings.ignoreMinorUpdate === undefined) {
    settings.ignoreMinorUpdate = defaultSettings.ignoreMinorUpdate;
    changed = true;
  }
  // v2.5.0 (move to states v2.6.0)
  // if (settings.visibleLayerPanel === undefined) {
  //   settings.visibleLayerPanel = defaultSettings.visibleLayerPanel;
  //   changed = true;
  // }
  if (settings.waifu2x === undefined) {
    settings.waifu2x = deepcopy(defaultSettings.waifu2x);
    changed = true;
  }
  return {
    data: settings,
    changed
  };
}
export function upgradeStates(states: States) {
  let changed = false;
  if (states.selectedPetaBoardId === undefined) {
    states.selectedPetaBoardId = "";
    changed = true;
  } 
  // 2.6.0
  if (states.browserTileSize === undefined) {
    states.browserTileSize = defaultStates.browserTileSize;
    changed = true;
  }
  // 2.6.0
  if (states.visibleLayerPanel === undefined) {
    states.visibleLayerPanel = defaultStates.visibleLayerPanel;
    changed = true;
  }
  // 2.6.0
  if (states.loadedPetaBoardId === undefined) {
    states.loadedPetaBoardId = states.selectedPetaBoardId;
    changed = true;
  }
  // 2.7.0
  if (states.windows === undefined) {
    states.windows = deepcopy(defaultStates.windows);
  }
  return {
    data: states,
    changed
  }
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
      const anyPetaTag = ((await petaTags.find({ name: tag }))[0] || {
        name: tag,
        id: uuid(),
        index: 0,
        petaImages: []
      }) as any;
      if (!anyPetaTag.petaImages) {
        anyPetaTag.petaImages = [];
      }
      anyPetaTag.petaImages.push(petaImage.id);
      anyPetaTag.petaImages = Array.from(new Set(anyPetaTag.petaImages));
      await petaTags.update({ id: anyPetaTag.id }, anyPetaTag, true);
      upgraded = true;
    },
    (anyPetaImage["tags"] || anyPetaImage["categories"] || []) as string[]).promise;
    anyPetaImage["tags"] = undefined;
  }
  await promiseSerial(addTags, petaImagesArr).promise;
  return upgraded;
}

export function upgradePetaPanel(petaPanel: PetaPanel) {
  // 1.8.0
  if (petaPanel.gif === undefined) {
    petaPanel.gif = {
      stopped: false,
      frame: 0
    }
  }
  // v2.5.0
  if (petaPanel.visible === undefined) {
    petaPanel.visible = true;
  }
  if (petaPanel.locked === undefined) {
    petaPanel.locked = false;
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
        const pipt = createPetaImagePetaTag(petaImageId, petaTag.id);
        await petaImagesPetaTags.update(
          { id: pipt.id },
          pipt,
          true
        );
        changed = true;
      }, petaImageIds).promise;
      // remove petaImages property
      (petaTag as any).petaImages = undefined;
      // update
      await petaTags.update(
        { id: petaTag.id },
        petaTag,
        false
      );
    }, (await petaTags.find({}))).promise;
  } catch (error) {
    //
  }
  // 2.6.0
  try {
    await promiseSerial(async (pipt) => {
      if (pipt.id.length > 64) {
        await petaImagesPetaTags.update(pipt, createPetaImagePetaTag(pipt.petaImageId, pipt.petaTagId));
      }
    }, (await petaImagesPetaTags.find({}))).promise;
  } catch (error) {
    //
  }
  return changed;
}

function migrate<T>(data: T, defaultData: T): T {
  Object.keys(defaultData).forEach((key) => {
    const dataType = typeof (data as any)[key];
    const defaultDataType = typeof (defaultData as any)[key];
    if (dataType === defaultDataType
      && !Array.isArray((defaultData as any)[key])
      && defaultDataType === "object"
    ) {
      (data as any)[key] = migrate((data as any)[key], (defaultData as any)[key]);
    }
    if (dataType !== defaultDataType) {
      (data as any)[key] = (defaultData as any)[key];
    }
  });
  return data;
}