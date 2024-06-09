import { IpcMainInvokeEvent } from "electron";

import { LogChunk } from "@/commons/datas/logChunk";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

type ExtractFunction<T> = T extends (...args: any[]) => any ? T : never;
export type IpcFunctionsType = {
  [C in keyof IpcFunctions]: {
    [N in keyof IpcFunctions[C]]: (
      event: IpcMainInvokeEvent,
      logger: LogChunk,
      ...args: Parameters<ExtractFunction<IpcFunctions[C][N]>>
    ) => ReturnType<ExtractFunction<IpcFunctions[C][N]>>;
  };
};
