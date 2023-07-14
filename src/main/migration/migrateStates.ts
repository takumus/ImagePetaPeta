import { defaultStates, States } from "@/commons/datas/states";

import { createSyncMigrater } from "@/main/libs/createMigrater";

export const migrateStates = createSyncMigrater<States>((data, update) => {
  // 2.7.0
  if (data.browserTileSize === undefined) {
    data.browserTileSize = defaultStates.browserTileSize;
    update();
  }
  // 3.0.0
  // if (data.groupingByDate === undefined) {
  //   data.groupingByDate = defaultStates.groupingByDate;
  //   update();
  // }
  // 3.0.0
  if (data.browserTileViewMode === undefined) {
    data.browserTileViewMode = defaultStates.browserTileViewMode;
    update();
  }
  return data;
});
