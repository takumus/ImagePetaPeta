import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";

export function hasPetaFiles(board: PetaBoard, petaFiles: PetaFile[]) {
  return petaFiles.reduce((need, petaFile) => {
    return need
      ? true
      : board
      ? Object.values(board.petaPanels).find(
          (petaPanel) => petaPanel.petaFileId === petaFile.id,
        ) !== undefined
      : false;
  }, false);
}
