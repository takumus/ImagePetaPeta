import { States, defaultStates } from "@/commons/datas/states";

import { createMigrater } from "@/main/libs/createMigrater";

export const migrateStates = createMigrater<States>(async (data, update) => {
  // 2.7.0
  if (data.browserTileSize === undefined) {
    data.browserTileSize = defaultStates.browserTileSize;
    update();
  }
  // 3.0.0
  if (data.groupingByDate === undefined) {
    data.groupingByDate = defaultStates.groupingByDate;
    update();
  }
  return data;
});