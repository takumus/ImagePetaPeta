import { getDefaultSettings, Settings } from "@/commons/datas/settings";

import { createSyncMigrater } from "@/main/libs/createMigrater";

const defaultSettings = getDefaultSettings();
export const migrateSettings = createSyncMigrater<Settings>((data, update) => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
  // v3.0.0
  if (data.eula === undefined) {
    data.eula = 0;
    update();
  }
  if (data.web === undefined) {
    data.web = anyData.developerMode !== undefined ? anyData.developerMode : false;
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
  if (data.disableAcceleratedVideoDecode === undefined) {
    data.disableAcceleratedVideoDecode = defaultSettings.disableAcceleratedVideoDecode;
    update();
  }
  return data;
});
