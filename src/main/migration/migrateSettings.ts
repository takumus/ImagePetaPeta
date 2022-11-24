import { Settings, getDefaultSettings } from "@/commons/datas/settings";

import { createMigrater } from "@/main/libs/createMigrater";

const defaultSettings = getDefaultSettings();
export const migrateSettings = createMigrater<Settings>(async (data, update) => {
  const anyData = data as any;
  // v2.8.0
  if (data.show === undefined) {
    data.show = defaultSettings.show;
    update();
  }
  if (data.loadTilesInOriginal === undefined) {
    data.loadTilesInOriginal = defaultSettings.loadTilesInOriginal;
    update();
  }
  if (data.showTagsOnTile === undefined) {
    data.showTagsOnTile = defaultSettings.showTagsOnTile;
    update();
  }
  if (data.eula === undefined) {
    data.eula = 0;
    update();
  }
  if (data.developerMode === undefined) {
    data.developerMode = false;
    update();
  }
  if (data.gamutMapSampling === undefined) {
    data.gamutMapSampling = defaultSettings.gamutMapSampling;
    update();
  }
  if (data.petaFileDirectory === undefined) {
    data.petaFileDirectory = anyData.petaImageDirectory;
    delete anyData.petaImageDirectory;
    update();
  }
  return data;
});
