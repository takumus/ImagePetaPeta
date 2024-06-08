import { createHash } from "node:crypto";
import { v4 } from "uuid";

import { createKey, createUseFunction } from "@/main/libs/di";

export function createSecureTempFileKey() {
  return createHash("sha512").update(v4()).digest("hex").substring(0, 32);
}
export const secureTempFileKeyKey =
  createKey<ReturnType<typeof createSecureTempFileKey>>("secureTempFileKey");
export const useSecureTempFileKey = createUseFunction(secureTempFileKeyKey);
