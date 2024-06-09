import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useConfigStates } from "@/main/provides/configs";
import { useWindows } from "@/main/provides/windows";

export const statesIPCFunctions: IpcFunctionsType["states"] = {
  async get(_, log) {
    const configStates = useConfigStates();
    log.debug(configStates.data);
    return configStates.data;
  },
  async update(event, log, states) {
    const configStates = useConfigStates();
    const windows = useWindows();
    try {
      configStates.data = states;
      configStates.save();
      windows.emitMainEvent({ type: "all" }, "common", "updateStates", states);
      log.debug("return:", configStates.data);
      return true;
    } catch (e) {
      log.error(e);
    }
    return false;
  },
};
