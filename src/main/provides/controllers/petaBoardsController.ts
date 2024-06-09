import { PetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/datas/updateMode";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBPetaBoards } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";

export class PetaBoardsController {
  async updateMultiple(boards: PetaBoard[], mode: UpdateMode) {
    return await ppa((board) => this.update(board, mode), boards).promise;
  }
  async getAll() {
    const dbPetaBoards = useDBPetaBoards();
    const boards: { [id: string]: PetaBoard } = {};
    dbPetaBoards.getAll().forEach((board) => {
      // バージョンアップ時のプロパティ更新
      boards[board.id] = board;
    });
    return boards;
  }
  private async update(board: PetaBoard, mode: UpdateMode) {
    const dbPetaBoards = useDBPetaBoards();
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("##Update PetaBoard");
    log.debug("mode:", mode);
    log.debug("board:", minimizeID(board.id));
    if (mode === "remove") {
      await dbPetaBoards.remove({ id: board.id });
    } else if (mode === "update") {
      await dbPetaBoards.update({ id: board.id }, board);
    } else {
      await dbPetaBoards.insert(board);
    }
    return true;
  }
}
export const petaBoardsControllerKey = createKey<PetaBoardsController>("petaBoardsController");
export const usePetaBoardsController = createUseFunction(petaBoardsControllerKey);
