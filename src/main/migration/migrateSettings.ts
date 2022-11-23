import { Settings, getDefaultSettings } from "@/commons/datas/settings";

import { createMigrater } from "@/main/libs/createMigrater";

const defaultSettings = getDefaultSettings();
export const migrateSettings = createMigrater<Settings>(async (data, update) => {
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
  return data;
});
