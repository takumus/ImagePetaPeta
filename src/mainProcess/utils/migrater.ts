import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PetaTag } from "@/commons/datas/petaTag";
import { getDefaultSettings, Settings } from "@/commons/datas/settings";
import { defaultStates, States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import {
  BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
  BOARD_DEFAULT_BACKGROUND_LINE_COLOR,
} from "@/commons/defines";
import { ppa } from "@/commons/utils/pp";
import DB from "@/mainProcess/storages/db";
import { v4 as uuid } from "uuid";
const defaultSettings = getDefaultSettings();
export function migratePetaImage(petaImage: PetaImage) {
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
      thumbnail: (petaImage as any).fileName + ".webp",
    };
  }
  // v2.6.0
  if (petaImage.palette === undefined) {
    petaImage.palette = [];
  }
  // v2.8.0
  if (petaImage.metadataVersion === undefined) {
    petaImage.metadataVersion = 0;
  }
  petaImage.palette.map((color) => {
    if (color.positionSD === undefined) {
      color.positionSD = 0;
    }
  });
  if (petaImage.note === undefined) {
    petaImage.note = "";
  }
  return petaImage;
}
export function migrateSettings(settings: Settings) {
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
  // if (settings.loadTilesInOriginal === undefined) {
  //   settings.loadTilesInOriginal = defaultSettings.loadTilesInOriginal;
  //   changed = true;
  // }
  // v1.6.0
  if (settings.alwaysShowNSFW === undefined) {
    settings.alwaysShowNSFW = defaultSettings.alwaysShowNSFW;
    changed = true;
  }
  if (settings.petaImageDirectory === undefined) {
    settings.petaImageDirectory = {
      default: defaultSettings.petaImageDirectory.default,
      path: defaultSettings.petaImageDirectory.path,
    };
    changed = true;
  }
  // v1.7.0
  // if (settings.autoAddTag === undefined) {
  //   settings.autoAddTag = defaultSettings.autoAddTag;
  //   changed = true;
  // }
  // v2.4.0
  // if (settings.ignoreMinorUpdate === undefined) {
  //   settings.ignoreMinorUpdate = defaultSettings.ignoreMinorUpdate;
  //   changed = true;
  // }
  // v2.5.0 (move to states v2.6.0)
  // if (settings.visibleLayerPanel === undefined) {
  //   settings.visibleLayerPanel = defaultSettings.visibleLayerPanel;
  //   changed = true;
  // }
  // if (settings.realESRGAN === undefined) {
  //   settings.realESRGAN = deepcopy(defaultSettings.realESRGAN);
  //   changed = true;
  // }
  // v2.8.0
  if (settings.show === undefined) {
    settings.show = defaultSettings.show;
    changed = true;
  }
  if (settings.loadTilesInOriginal === undefined) {
    settings.loadTilesInOriginal = defaultSettings.loadTilesInOriginal;
    changed = true;
  }
  if (settings.showTagsOnTile === undefined) {
    settings.showTagsOnTile = defaultSettings.showTagsOnTile;
    changed = true;
  }
  if (settings.eula === undefined) {
    settings.eula = 0;
    changed = true;
  }
  if (settings.developerMode === undefined) {
    settings.developerMode = false;
    changed = true;
  }
  return {
    data: settings,
    changed,
  };
}
export function migrateStates(states: States) {
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
    states.loadedPetaBoardId = defaultStates.selectedPetaBoardId;
    changed = true;
  }
  // 3.0.0
  if (states.groupingByDate === undefined) {
    states.groupingByDate = defaultStates.groupingByDate;
    changed = true;
  }
  return {
    data: states,
    changed,
  };
}
export function migrateWindowStates(states: WindowStates) {
  const changed = false;
  //
  return {
    data: states,
    changed,
  };
}
export function migratePetaBoard(board: PetaBoard) {
  // v0.5.0
  if (board.background === undefined) {
    board.background = {
      fillColor: BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      lineColor: BOARD_DEFAULT_BACKGROUND_LINE_COLOR,
    };
  }
  // board.petaPanels.forEach((petaPanel) => {
  //   migratePetaPanel(petaPanel);
  // });

  // v3.0.0
  if (Array.isArray(board.petaPanels)) {
    const petaPanels = board.petaPanels as PetaPanel[];
    const newPetaPanels: { [id: string]: PetaPanel } = {};
    petaPanels.forEach((petaPanel) => {
      newPetaPanels[petaPanel.id] = petaPanel;
    });
    board.petaPanels = newPetaPanels;
  }

  Object.values(board.petaPanels).forEach((petaPanel) => {
    migratePetaPanel(petaPanel);
  });

  return board;
}
// 1.8.0
export async function migratePetaTag(petaTags: DB<PetaTag>, petaImages: PetaImages) {
  const petaImagesArr = Object.values(petaImages);
  let migrated = false;
  const addTags = async (petaImage: PetaImage, index: number) => {
    const anyPetaImage = petaImage as any;
    await ppa(async (tag) => {
      const anyPetaTag = ((await petaTags.find({ name: tag }))[0] || {
        name: tag,
        id: uuid(),
        index: 0,
        petaImages: [],
      }) as any;
      if (!anyPetaTag.petaImages) {
        anyPetaTag.petaImages = [];
      }
      anyPetaTag.petaImages.push(petaImage.id);
      anyPetaTag.petaImages = Array.from(new Set(anyPetaTag.petaImages));
      await petaTags.insert(anyPetaTag);
      migrated = true;
    }, (anyPetaImage["tags"] || anyPetaImage["categories"] || []) as string[]).promise;
    anyPetaImage["tags"] = undefined;
  };
  await ppa(addTags, petaImagesArr).promise;
  return migrated;
}

export function migratePetaPanel(petaPanel: PetaPanel) {
  // 1.8.0
  if (petaPanel.gif === undefined) {
    petaPanel.gif = {
      stopped: false,
      frame: 0,
    };
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
export async function migratePetaImagesPetaTags(
  petaTags: DB<PetaTag>,
  petaImagesPetaTags: DB<PetaImagePetaTag>,
  petaImages: PetaImages,
) {
  let changed = false;
  try {
    await ppa(async (petaTag) => {
      const petaImageIds = (petaTag as any).petaImages as string[] | undefined;
      if (!petaImageIds) {
        return;
      }
      await ppa(async (petaImageId) => {
        if (!petaImages[petaImageId]) {
          return;
        }
        const pipt = createPetaImagePetaTag(petaImageId, petaTag.id);
        await petaImagesPetaTags.insert(pipt);
        changed = true;
      }, petaImageIds).promise;
      // remove petaImages property
      (petaTag as any).petaImages = undefined;
      // update
      await petaTags.update({ id: petaTag.id }, petaTag);
    }, petaTags.getAll()).promise;
  } catch (error) {
    //
  }
  // 2.6.0
  try {
    await ppa(async (pipt) => {
      if (pipt.id.length > 64) {
        await petaImagesPetaTags.update(
          pipt,
          createPetaImagePetaTag(pipt.petaImageId, pipt.petaTagId),
        );
      }
    }, petaImagesPetaTags.getAll()).promise;
  } catch (error) {
    //
  }
  return changed;
}
