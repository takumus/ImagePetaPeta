import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { showError } from "@/main/errorWindow";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";

export const petaFilesIPCFunctions: IpcFunctionsType["petaFiles"] = {
  async getAll(_, logger) {
    const petaFilesController = usePetaFilesController();
    try {
      const petaFiles = petaFilesController.getAllAsMap();
      logger.debug("return:", true);
      return petaFiles;
    } catch (e) {
      logger.error(e);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaFiles Error",
        message: String(e),
      });
    }
    return {};
  },
  async update(event, logger, datas, mode) {
    const petaFilesController = usePetaFilesController();
    try {
      await petaFilesController.updateMultiple(datas, mode);
      logger.debug("return:", true);
      return true;
    } catch (err) {
      logger.error(err);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaFiles Error",
        message: String(err),
      });
    }
    return false;
  },
  async regenerate(_, log) {
    const petaFilesController = usePetaFilesController();
    try {
      log.debug("start");
      await petaFilesController.regenerate();
      log.debug("end");
      return;
    } catch (err) {
      log.error(err);
      showError({
        category: "M",
        code: 200,
        title: "Regenerate Thumbnails Error",
        message: String(err),
      });
    }
    return;
  },
  async getIDs(event, log, params) {
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    try {
      log.debug("type:", params.type);
      const ids = await petaFilesPetaTagsController.getPetaFileIds(params);
      log.debug("return:", ids.length);
      return ids;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaFileIds Error",
        message: String(error),
      });
    }
    return [];
  },
};
