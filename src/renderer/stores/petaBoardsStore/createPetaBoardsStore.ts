import { InjectionKey, ref } from "vue";

import { createPetaBoard, PetaBoard } from "@/commons/datas/petaBoard";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { UpdateMode } from "@/commons/datas/updateMode";
import { BOARD_DEFAULT_NAME, BOARD_SAVE_DELAY } from "@/commons/defines";
import { Vec2 } from "@/commons/utils/vec2";

import { DelayUpdater } from "@/renderer/libs/delayUpdater";
import { IPC } from "@/renderer/libs/ipc";
import getNameAvoidDuplication from "@/renderer/utils/getNameAvoidDuplication";

export async function createPetaBoardsStore() {
  const states = ref<{ [petaBoardId: string]: RPetaBoard }>({});
  const boardUpdaters = ref<{ [key: string]: DelayUpdater<RPetaBoard> }>({});
  async function getPetaBoards() {
    states.value = Object.values(await IPC.petaBoards.getAll()).reduce(
      (petaBoards, petaBoard) => {
        return {
          ...petaBoards,
          [petaBoard.id]: petaBoardToRPetaBoard(petaBoard),
        };
      },
      {} as { [petaBoardId: string]: RPetaBoard },
    );
    Object.values(states.value).forEach((board) => {
      let updater = boardUpdaters.value[board.id];
      if (updater) {
        updater.destroy();
      }
      updater = boardUpdaters.value[board.id] = new DelayUpdater<RPetaBoard>(BOARD_SAVE_DELAY);
      updater.initData(board);
      updater.onUpdate((board) => {
        IPC.petaBoards.update([rPetaBoardToPetaBoard(board)], "update");
      });
    });
  }
  function getPetaBoard(petaBoardId?: string) {
    if (petaBoardId === undefined) {
      return undefined;
    }
    return states.value[petaBoardId];
  }
  function savePetaBoard(petaBoard: RPetaBoard) {
    states.value[petaBoard.id] = petaBoard;
    boardUpdaters.value[petaBoard.id]?.order(petaBoard);
  }
  async function removePetaBoard(petaBoard: RPetaBoard) {
    boardUpdaters.value[petaBoard.id]?.destroy();
    delete boardUpdaters.value[petaBoard.id];
    await IPC.petaBoards.update([rPetaBoardToPetaBoard(petaBoard)], "remove");
    await getPetaBoards();
  }
  async function addPetaBoard(fillColor: string, lineColor: string) {
    const name = getNameAvoidDuplication(
      BOARD_DEFAULT_NAME,
      Object.values(states.value).map((b) => b.name),
    );
    const board = createPetaBoard(
      name,
      Math.max(...Object.values(states.value).map((b) => b.index), 0) + 1,
      fillColor,
      lineColor,
    );
    await IPC.petaBoards.update([board], "insert");
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
function petaBoardToRPetaBoard(petaBoard: PetaBoard): RPetaBoard {
  return {
    ...petaBoard,
    transform: {
      ...petaBoard.transform,
      position: new Vec2(petaBoard.transform.position),
    },
    petaPanels: Object.values(petaBoard.petaPanels).reduce(
      (petaPanels, petaPanel) => {
        return {
          ...petaPanels,
          [petaPanel.id]: {
            ...petaPanel,
            crop: {
              ...petaPanel.crop,
              position: new Vec2(petaPanel.crop.position),
            },
            position: new Vec2(petaPanel.position),
            renderer: {
              selected: false,
            },
          } as RPetaPanel,
        };
      },
      {} as { [petaPanelId: string]: RPetaPanel },
    ),
    renderer: {
      selected: false,
    },
  };
}
function rPetaBoardToPetaBoard(rPetaBoard: RPetaBoard): PetaBoard {
  const petaBoard = {
    ...rPetaBoard,
    petaPanels: Object.values(rPetaBoard.petaPanels).reduce(
      (rPetaPanels, rPetaPanel) => {
        const petaPanel = {
          ...rPetaPanel,
        } as Partial<RPetaPanel>;
        delete petaPanel.renderer;
        return {
          ...rPetaPanels,
          [rPetaPanel.id]: {
            ...petaPanel,
          } as PetaPanel,
        };
      },
      {} as { [petaPanelId: string]: PetaPanel },
    ),
  } as Partial<RPetaBoard>;
  delete petaBoard.renderer;
  return petaBoard as PetaBoard;
}
export type PetaBoardsStore = Awaited<ReturnType<typeof createPetaBoardsStore>>;
export const petaBoardsStoreKey: InjectionKey<PetaBoardsStore> = Symbol("petaBoardsStore");
