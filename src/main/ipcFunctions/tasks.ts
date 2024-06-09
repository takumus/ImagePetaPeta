import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useTasks } from "@/main/provides/tasks";

export const tasksIPCFunctions: IpcFunctionsType["tasks"] = {
  async cancel(event, logger, ids) {
    const tasks = useTasks();
    logger.debug(ids);
    tasks.cancel(ids);
    return;
  },
  async getStatus(event) {
    return useTasks().getStatus();
  },
  async confirmFailed(event, logger, ids) {
    const tasks = useTasks();
    logger.debug(ids);
    tasks.confirmFailed(ids);
    return;
  },
};
