import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { showError } from "@/main/errorWindow";
import { usePetaTagPartitionsCOntroller } from "@/main/provides/controllers/petaTagPartitionsController";

export const petaTagPartitionsIPCFunctions: IpcFunctionsType["petaTagPartitions"] = {
  async update(event, log, partitions, mode) {
    const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
    try {
      await petaTagpartitionsController.updateMultiple(partitions, mode);
      log.debug("return:", true);
      return true;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaFilesPetaTags Error",
        message: String(error),
      });
    }
    return false;
  },
  async getAll(_, log) {
    const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
    try {
      const petaTagPartitions = await petaTagpartitionsController.getAll();
      log.debug("return:", petaTagPartitions.length);
      return petaTagPartitions;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaTagPartitions Error",
        message: String(error),
      });
    }
    return [];
  },
};
