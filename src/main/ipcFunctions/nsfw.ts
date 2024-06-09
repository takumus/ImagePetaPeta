import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useNSFW } from "@/main/provides/nsfw";
import { useWindows } from "@/main/provides/windows";

export const nsfwIPCFunctions: IpcFunctionsType["nsfw"] = {
  async get(_, log) {
    const nsfw = useNSFW();
    log.debug(nsfw.getShowNSFW());
    return nsfw.getShowNSFW();
  },
  async set(event, log, value) {
    const nsfw = useNSFW();
    log.debug(value);
    const windows = useWindows();
    nsfw.setTemporaryShowNSFW(value);
    windows.emit.common.showNSFW({ type: "all" }, nsfw.getShowNSFW());
  },
};
