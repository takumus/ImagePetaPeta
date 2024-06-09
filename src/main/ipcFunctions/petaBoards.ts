import { createPetaBoard } from "@/commons/datas/petaBoard";
import { BOARD_DEFAULT_NAME } from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { showError } from "@/main/errorWindow";
import { usePetaBoardsController } from "@/main/provides/controllers/petaBoardsController";
import { getStyle } from "@/main/utils/darkMode";

export const petaBoardsIPCFunctions: IpcFunctionsType["petaBoards"] = {
  async getAll(_, logger) {
    const petaBoardsController = usePetaBoardsController();
    try {
      const petaBoards = await petaBoardsController.getAllAsMap();
      const length = Object.keys(petaBoards).length;
      if (length === 0) {
        logger.debug("no boards! create empty board");
        const style = getStyle();
        const board = createPetaBoard(
          BOARD_DEFAULT_NAME,
          0,
          style["--color-0"],
          style["--color-2"],
        );
        await petaBoardsController.updateMultiple([board], "insert");
        petaBoards[board.id] = board;
      }
      logger.debug("return:", length);
      return petaBoards;
    } catch (e) {
      logger.error(e);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaBoards Error",
        message: String(e),
      });
    }
    return {};
  },
  async update(event, logger, boards, mode) {
    const petaBoardsController = usePetaBoardsController();
    try {
      await petaBoardsController.updateMultiple(boards, mode);
      logger.debug("return:", true);
      return true;
    } catch (e) {
      logger.error(e);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaBoards Error",
        message: String(e),
      });
    }
    return false;
  },
};
