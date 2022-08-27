import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { upgradePetaBoard } from "@/mainProcess/utils/upgrader";
export class PetaDataPetaBoards {
  constructor(private parent: PetaDatas) {}
  async updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaBoard");
    log.log("mode:", mode);
    log.log("board:", minimId(board.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaBoard.remove({ id: board.id });
      log.log("removed");
      return true;
    }
    await this.parent.datas.dbPetaBoard.update({ id: board.id }, board, mode === UpdateMode.UPSERT);
    log.log("updated");
    return true;
  }
  async getPetaBoards() {
    const boards: { [id: string]: PetaBoard } = {};
    (await this.parent.datas.dbPetaBoard.find({})).forEach((board) => {
      // バージョンアップ時のプロパティ更新
      upgradePetaBoard(board);
      boards[board.id] = board;
    });
    return boards;
  }
}
