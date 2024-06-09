import { IpcEvents } from "@/commons/ipc/ipcEvents";

import { EmitMainEventTarget } from "@/main/provides/windows";

export type IpcEventsType = {
  [C in keyof IpcEvents]: {
    [U in keyof IpcEvents[C]]: (
      target: EmitMainEventTarget,
      ...args: Parameters<IpcEvents[C][U] extends (...args: any) => any ? IpcEvents[C][U] : never>
    ) => void;
  };
};
