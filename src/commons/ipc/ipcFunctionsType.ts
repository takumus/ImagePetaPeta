import { IpcMainInvokeEvent } from "electron";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

export type IpcFunctionsType = {
  [P in keyof IpcFunctions]: (
    event: IpcMainInvokeEvent,
    ...args: Parameters<IpcFunctions[P]>
  ) => ReturnType<IpcFunctions[P]>;
};
