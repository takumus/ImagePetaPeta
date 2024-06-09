import { IpcMainInvokeEvent } from "electron";

import { LogChunk } from "@/commons/datas/logChunk";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

export type IpcFunctionsType = {
  [C in keyof IpcFunctions]: {
    [N in keyof IpcFunctions[C]]: (
      event: IpcMainInvokeEvent,
      logger: LogChunk,
      ...args: Parameters<FunctionGuard<IpcFunctions[C][N]>>
    ) => ReturnType<FunctionGuard<IpcFunctions[C][N]>>;
  };
};
