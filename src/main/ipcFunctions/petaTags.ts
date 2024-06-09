import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { showError } from "@/main/errorWindow";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";

export const petaTagsIPCFunctions: IpcFunctionsType["petaTags"] = {
  async update(event, log, tags, mode) {
    const petaTagsController = usePetaTagsController();
    try {
      await petaTagsController.updateMultiple(tags, mode);
      log.debug("return:", true);
      return true;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaTags Error",
        message: String(error),
      });
    }
    return false;
  },
  async getAll(_, log) {
    const petaTagsController = usePetaTagsController();
    try {
      const petaTags = await petaTagsController.getAll();
      log.debug("return:", petaTags.length);
      return petaTags;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaTags Error",
        message: String(error),
      });
    }
    return [];
  },
};
