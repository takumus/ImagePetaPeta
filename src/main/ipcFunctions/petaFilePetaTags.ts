import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { showError } from "@/main/errorWindow";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";

export const petaFilePetaTagsIPCFunctions: IpcFunctionsType["petaFilePetaTags"] = {
  async update(event, log, petaFileIds, petaTagLikes, mode) {
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    try {
      await petaFilesPetaTagsController.updatePetaFilesPetaTags(petaFileIds, petaTagLikes, mode);
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
  async getPetaTagIdsByPetaFileIds(event, log, petaFileIds) {
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    try {
      const petaTagIds = await petaFilesPetaTagsController.getPetaTagIdsByPetaFileIds(petaFileIds);
      return petaTagIds;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaTagIds By PetaFileIds Error",
        message: String(error),
      });
    }
    return [];
  },
  async getPetaTagCount(event, log, petaTag) {
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    try {
      const petaTagCount = await petaFilesPetaTagsController.getPetaTagCount(petaTag);
      log.debug("return:", petaTagCount);
      return petaTagCount;
    } catch (error) {
      log.error(error);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaTagCounts Error",
        message: String(error),
      });
    }
    return -1;
  },
};
