import { InjectionKey, ref } from "vue";
import { IPC } from "@/rendererProcess/ipc";
import { inject } from "@/rendererProcess/utils/vue";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import {
  createPetaBoard,
  dbPetaBoardsToPetaBoards,
  PetaBoard,
  petaBoardsToDBPetaBoards,
} from "@/commons/datas/petaBoard";
import { DelayUpdater } from "@/rendererProcess/utils/delayUpdater";
import { DEFAULT_BOARD_NAME, SAVE_DELAY } from "@/commons/defines";
import getNameAvoidDuplication from "@/rendererProcess/utils/getNameAvoidDuplication";
export async function createPetaBoardsStore() {
  const states = ref<{ [petaBoardId: string]: PetaBoard }>({});
  const boardUpdaters = ref<{ [key: string]: DelayUpdater<PetaBoard> }>({});
  async function getPetaBoards() {
    states.value = await IPC.send("getPetaBoards");
    dbPetaBoardsToPetaBoards(states.value, false);
    Object.values(states.value).forEach((board) => {
      let updater = boardUpdaters.value[board.id];
      if (updater) {
        updater.destroy();
      }
      updater = boardUpdaters.value[board.id] = new DelayUpdater<PetaBoard>(SAVE_DELAY);
      updater.initData(board);
      updater.onUpdate((board) => {
        IPC.send("updatePetaBoards", [petaBoardsToDBPetaBoards(board)], UpdateMode.UPDATE);
      });
    });
  }
  function getPetaBoard(petaBoardId?: string) {
    if (petaBoardId === undefined) {
      return undefined;
    }
    return states.value[petaBoardId];
  }
  function savePetaBoard(petaBoard: PetaBoard) {
    states.value[petaBoard.id] = petaBoard;
    boardUpdaters.value[petaBoard.id]?.order(petaBoard);
  }
  async function removePetaBoard(petaBoard: PetaBoard) {
    boardUpdaters.value[petaBoard.id]?.destroy();
    delete boardUpdaters.value[petaBoard.id];
    await IPC.send("updatePetaBoards", [petaBoard], UpdateMode.REMOVE);
    await getPetaBoards();
  }
  async function addPetaBoard(dark = false) {
    const name = getNameAvoidDuplication(
      DEFAULT_BOARD_NAME,
      Object.values(states.value).map((b) => b.name),
    );
    const board = createPetaBoard(
      name,
      Math.max(...Object.values(states.value).map((b) => b.index), 0) + 1,
      dark,
    );
    await IPC.send("updatePetaBoards", [board], UpdateMode.INSERT);
    await getPetaBoards();
    const addedBoard = states.value[board.id];
    if (addedBoard === undefined) {
      throw new Error("Could not add PetaBoard");
    }
    return addedBoard;
  }
  await getPetaBoards();
  return {
    state: states,
    getPetaBoard,
    savePetaBoard,
    removePetaBoard,
    addPetaBoard,
    getPetaBoards,
  };
}
export function usePetaBoardsStore() {
  return inject(petaBoardsStoreKey);
}
export type PetaBoardsStore = Awaited<ReturnType<typeof createPetaBoardsStore>>;
export const petaBoardsStoreKey: InjectionKey<PetaBoardsStore> = Symbol("petaBoardsStore");
