import { IpcEvents } from "@/commons/ipc/ipcEvents";

import { createKey, createUseFunction } from "@/main/libs/di";

export const emitMainEventKey =
  createKey<<U extends keyof IpcEvents>(key: U, ...args: Parameters<IpcEvents[U]>) => void>(
    "emitMainEvent",
  );
export const useEmitMainEvent = createUseFunction(emitMainEventKey);
