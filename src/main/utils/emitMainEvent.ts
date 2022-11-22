import { IpcEvents } from "@/commons/ipc/ipcEvents";
import { useWindows } from "@/main/provides/utils/windows";

export function emitMainEvent<U extends keyof IpcEvents>(
  key: U,
  ...args: Parameters<IpcEvents[U]>
) {
  const windows = useWindows();
  windows.emitMainEvent(key, ...args);
}
