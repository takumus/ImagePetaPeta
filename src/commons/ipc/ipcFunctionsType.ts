import { IpcMainInvokeEvent } from "electron";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

export type IpcFunctionsType = {
  [C in keyof IpcFunctions]: {
    [N in keyof IpcFunctions[C]]: (
      event: IpcMainInvokeEvent,
      ...args: Parameters<
        IpcFunctions[C][N] extends (...args: any) => any ? IpcFunctions[C][N] : never
      >
    ) => ReturnType<IpcFunctions[C][N] extends (...args: any) => any ? IpcFunctions[C][N] : never>;
  };
};
