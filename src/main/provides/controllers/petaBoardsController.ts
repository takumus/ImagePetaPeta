import { PetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/datas/updateMode";
import { ppa } from "@/commons/utils/pp";
import { minimId } from "@/commons/utils/utils";

import { useDBPetaBoards } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { createKey, createUseFunction } from "@/main/utils/di";
import { migratePetaBoard } from "@/main/utils/migrater";

export class PetaBoardsController {
  async updatePetaBoards(boards: PetaBoard[], mode: UpdateMode) {
    return await ppa((board) => this.updatePetaBoard(board, mode), boards).promise;
  }
  async getPetaBoards() {
    const dbPetaBoards = useDBPetaBoards();
    const boards: { [id: string]: PetaBoard } = {};
    dbPetaBoards.getAll().forEach((board) => {
      // バージョンアップ時のプロパティ更新
      migratePetaBoard(board);
      boards[board.id] = board;
    });
    return boards;
  }
  private async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const dbPetaBoards = useDBPetaBoards();
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.log("##Update PetaBoard");
    log.log("mode:", mode);
    log.log("board:", minimId(board.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaBoards.remove({ id: board.id });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaBoards.update({ id: board.id }, board);
    } else {
      await dbPetaBoards.insert(board);
    }
    return true;
  }
}
export const petaBoardsControllerKey = createKey<PetaBoardsController>("petaBoardsController");
export const usePetaBoardsController = createUseFunction(petaBoardsControllerKey);
