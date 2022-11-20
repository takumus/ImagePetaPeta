import { UpdateMode } from "@/commons/datas/updateMode";
import { minimId } from "@/commons/utils/utils";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { migratePetaBoard } from "@/main/utils/migrater";
import { ppa } from "@/commons/utils/pp";
import { createKey, inject } from "@/main/utils/di";
import { dbPetaBoardsKey } from "@/main/databases";
import { mainLoggerKey } from "@/main/utils/mainLogger";
export class PetaBoardsController {
  async updatePetaBoards(boards: PetaBoard[], mode: UpdateMode) {
    return await ppa((board) => this.updatePetaBoard(board, mode), boards).promise;
  }
  async getPetaBoards() {
    const dbPetaBoards = inject(dbPetaBoardsKey);
    const boards: { [id: string]: PetaBoard } = {};
    dbPetaBoards.getAll().forEach((board) => {
      // バージョンアップ時のプロパティ更新
      migratePetaBoard(board);
      boards[board.id] = board;
    });
    return boards;
  }
  private async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const dbPetaBoards = inject(dbPetaBoardsKey);
    const mainLogger = inject(mainLoggerKey);
    const log = mainLogger.logChunk();
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
