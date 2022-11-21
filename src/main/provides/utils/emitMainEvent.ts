import { ToFrontFunctions } from "@/commons/ipc/toFrontFunctions";
import { createKey } from "@/main/utils/di";

export const emitMainEventKey =
  createKey<
    <U extends keyof ToFrontFunctions>(key: U, ...args: Parameters<ToFrontFunctions[U]>) => void
  >("emitMainEvent");
