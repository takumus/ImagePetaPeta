import { WindowStates } from "@/commons/datas/windowStates";

import { createMigrater } from "@/main/libs/createMigrater";

export const migrateWindowStates = createMigrater<WindowStates>(async (data) => {
  return data;
});
