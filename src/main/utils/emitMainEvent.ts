import { IpcEvents } from "@/commons/ipc/ipcEvents";

import { EmitMainEventTarget, useWindows } from "@/main/provides/utils/windows";

export function emitMainEvent<U extends keyof IpcEvents>(
  target: EmitMainEventTarget,
  key: U,
  ...args: Parameters<IpcEvents[U]>
): void {
  const windows = useWindows();
  windows.emitMainEvent(target, key, ...args);
}
