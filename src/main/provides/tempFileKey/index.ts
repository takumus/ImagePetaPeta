import { v4 } from "uuid";

import { createKey, createUseFunction } from "@/main/libs/di";
import { passwordToKey } from "@/main/utils/secureFile";

export function createSecureTempFileKey() {
  return passwordToKey(v4());
}
export const secureTempFileKeyKey =
  createKey<ReturnType<typeof createSecureTempFileKey>>("secureTempFileKey");
export const useSecureTempFileKey = createUseFunction(secureTempFileKeyKey);
