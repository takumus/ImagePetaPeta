import { v4 as uuid } from "uuid";

import { Library } from "@/commons/datas/library";

import { createSyncMigrater } from "@/main/libs/createMigrater";

export const migrateLibrary = createSyncMigrater<Library>((data, update) => {
  if (data.id === undefined || data.id === "") {
    data.id = uuid();
    update();
  }
  return data;
});
