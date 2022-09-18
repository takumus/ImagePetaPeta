import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { migratePetaBoard } from "@/mainProcess/utils/migrater";
import { promiseSerial } from "@/commons/utils/promiseSerial";
export class PetaDataPetaBoards {
  constructor(private parent: PetaDatas) {}
  async updatePetaBoards(boards: PetaBoard[], mode: UpdateMode) {
    return await promiseSerial((board) => this.updatePetaBoard(board, mode), boards).promise;
  }
  async getPetaBoards() {
    const boards: { [id: string]: PetaBoard } = {};
    (await this.parent.datas.dbPetaBoard.find({})).forEach((board) => {
      // バージョンアップ時のプロパティ更新
      migratePetaBoard(board);
      boards[board.id] = board;
    });
    return boards;
  }
  private async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaBoard");
    log.log("mode:", mode);
    log.log("board:", minimId(board.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaBoard.remove({ id: board.id });
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaBoard.update({ id: board.id }, board);
    } else {
      await this.parent.datas.dbPetaBoard.insert(board);
    }
    return true;
  }
}
