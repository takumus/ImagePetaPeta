import { v4 as uuid } from "uuid";

import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaImagePetaTag, createPetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { States, defaultStates } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import { ppa } from "@/commons/utils/pp";

import DB from "@/main/storages/db";

const defaultSettings = getDefaultSettings();
export function migratePetaImage(petaImage: PetaImage) {
  let migrated = false;
  const anyPetaImage = petaImage as any;
  if (petaImage.note === undefined) {
    petaImage.note = "";
    migrated = true;
  }
  // v3.0.0
  if (petaImage.metadata === undefined) {
    petaImage.metadata = {
      type: "image",
      width: anyPetaImage.width,
      height: anyPetaImage.height,
      palette: anyPetaImage.palette ?? [],
      version: anyPetaImage.metadataVersion ?? 0,
    };
    delete anyPetaImage.width;
    delete anyPetaImage.height;
    delete anyPetaImage.palette;
    delete anyPetaImage.metadataVersion;
    migrated = true;
  }
  return migrated;
}
export function migrateSettings(settings: Settings) {
  let changed = false;
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
export async function migratePetaTagPartition(petaTagPartition: PetaTagPartition) {
  petaTagPartition;
  return petaTagPartition;
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
