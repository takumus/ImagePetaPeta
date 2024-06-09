import { IpcEvents } from "@/commons/ipc/ipcEvents";

import { EmitMainEventTarget } from "@/main/provides/windows";

type ExtractFunction<T> = T extends (...args: any[]) => any ? T : never;
export type IpcEventsType = {
  [C in keyof IpcEvents]: {
    [U in keyof IpcEvents[C]]: (
      target: EmitMainEventTarget,
      ...args: Parameters<ExtractFunction<IpcEvents[C][U]>>
    ) => void;
  };
};
