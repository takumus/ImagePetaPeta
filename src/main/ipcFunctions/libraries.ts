import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useConfigLibraries } from "@/main/provides/configs";
import { useWindows } from "@/main/provides/windows";

export const librariesIPCFunctions: IpcFunctionsType["libraries"] = {
  async get(_, log) {
    const config = useConfigLibraries();
    log.debug(config.data);
    return config.data;
  },
  async update(event, log, states) {
    const config = useConfigLibraries();
    const windows = useWindows();
    try {
      config.data = states;
      config.save();
      windows.emit.libraries.update({ type: "all" }, states);
      log.debug("return:", config.data);
      return true;
    } catch (e) {
      log.error(e);
    }
    return false;
  },
};
