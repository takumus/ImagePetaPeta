import { WindowStates } from "@/commons/datas/windowStates";

import { createSyncMigrater } from "@/main/libs/createMigrater";

export const migrateWindowStates = createSyncMigrater<WindowStates>((data) => {
  return data;
});
