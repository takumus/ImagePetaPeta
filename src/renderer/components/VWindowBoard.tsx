import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { createPetaBoard, PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { States } from "@/commons/datas/states";
import { BOARD_DEFAULT_NAME } from "@/commons/defines";
import { Vec2 } from "@/commons/utils/vec2";

import VBoard from "@/renderer/components/board/VBoard";
import VBoardProperty from "@/renderer/components/board/VBoardProperty";
import VTabBar from "@/renderer/components/board/VTabBar";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu";
import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useStyleStore } from "@/renderer/stores/styleStore/useStyleStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import getNameAvoidDuplication from "@/renderer/utils/getNameAvoidDuplication";

const rootStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "surface",
  color: "text",
});

const topStyle = css({
  display: "flex",
  flexDirection: "column",
});

const contentStyle = css({
  flex: 1,
  overflow: "hidden",
  padding: "px2",
});

function toRPetaBoard(board: PetaBoard): RPetaBoard {
  return {
    ...board,
    transform: {
      ...board.transform,
      position: new Vec2(board.transform.position),
    },
    petaPanels: Object.values(board.petaPanels).reduce(
      (panels, panel) => ({
        ...panels,
        [panel.id]: {
          ...panel,
          crop: {
            ...panel.crop,
            position: new Vec2(panel.crop.position),
          },
          position: new Vec2(panel.position),
          renderer: {
            selected: false,
          },
        },
      }),
      {} as Record<string, RPetaPanel>,
    ),
    renderer: {
      selected: false,
    },
  };
}

function toPetaBoard(board: RPetaBoard): PetaBoard {
  const nextBoard = {
    ...board,
    petaPanels: Object.values(board.petaPanels).reduce(
      (panels, panel) => {
        const nextPanel = { ...panel } as Partial<RPetaPanel>;
        delete nextPanel.renderer;
        return {
          ...panels,
          [panel.id]: nextPanel as PetaPanel,
        };
      },
      {} as Record<string, PetaPanel>,
    ),
  } as Partial<RPetaBoard>;
  delete nextBoard.renderer;
  return nextBoard as PetaBoard;
}

function sortBoards(boards: RPetaBoard[]) {
  return [...boards].sort((a, b) => a.index - b.index);
}

export default function VWindowBoard() {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const styleStore = useStyleStore();
  const { windowTitle } = useWindowTitleStore();
  const [boards, setBoards] = useState<RPetaBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [petaFilesById, setPetaFilesById] = useState<Record<string, PetaFile>>({});
  const title = useMemo(() => t("titles.board"), [t]);

  useEffect(() => {
    windowTitle.value = `${title} - ${appInfoStore.state.value.name}`;
  }, [appInfoStore.state.value.name, title, windowTitle]);

  useEffect(() => {
    let mounted = true;

    void Promise.all([IPC.petaBoards.getAll(), IPC.petaFiles.getAll(), IPC.states.get()]).then(
      ([nextBoards, nextPetaFiles, nextStates]) => {
        if (!mounted) {
          return;
        }
        const loadedBoards = sortBoards(Object.values(nextBoards).map(toRPetaBoard));
        setBoards(loadedBoards);
        setPetaFilesById(nextPetaFiles);
        const restoredBoardId =
          loadedBoards.find((board) => board.id === nextStates.selectedPetaBoardId)?.id ??
          loadedBoards[0]?.id ??
          "";
        setSelectedBoardId(restoredBoardId);
        if (restoredBoardId) {
          void syncStates(nextStates, restoredBoardId);
        }
      },
    );

    const petaFilesSubscription = IPC.petaFiles.on("update", (_event, updates, mode) => {
      setPetaFilesById((current) => {
        const next = { ...current };
        updates.forEach((petaFile) => {
          if (mode === "remove") {
            delete next[petaFile.id];
          } else {
            next[petaFile.id] = petaFile;
          }
        });
        return next;
      });
    });

    return () => {
      mounted = false;
      petaFilesSubscription.off();
    };
  }, []);

  const currentBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId),
    [boards, selectedBoardId],
  );

  async function syncStates(baseStates: States | null, boardId: string) {
    const currentStates = baseStates ?? (await IPC.states.get());
    await IPC.states.update({
      ...currentStates,
      selectedPetaBoardId: boardId,
      loadedPetaBoardId: boardId,
    });
  }

  async function selectBoard(board: RPetaBoard) {
    setSelectedBoardId(board.id);
    await syncStates(null, board.id);
  }

  async function saveBoard(nextBoard: RPetaBoard) {
    setBoards((current) => sortBoards(current.map((board) => (board.id === nextBoard.id ? nextBoard : board))));
    await IPC.petaBoards.update([toPetaBoard(nextBoard)], "update");
  }

  async function removeBoard(board: RPetaBoard) {
    const result = await IPC.modals.open(t("boards.removeDialog", [board.name]), [
      t("commons.yes"),
      t("commons.no"),
    ]);
    if (result !== 0) {
      return;
    }

    const currentIndex = boards.findIndex((item) => item.id === board.id);
    const nextBoards = boards.filter((item) => item.id !== board.id);
    setBoards(nextBoards);
    await IPC.petaBoards.update([toPetaBoard(board)], "remove");
    const nextBoard = nextBoards[currentIndex] ?? nextBoards[currentIndex - 1] ?? nextBoards[0];
    if (nextBoard) {
      await selectBoard(nextBoard);
    }
  }

  async function addBoard() {
    const names = boards.map((board) => board.name);
    const name = getNameAvoidDuplication(BOARD_DEFAULT_NAME, names);
    const fallbackFillColor =
      styleStore.style.value["--color-0"] ??
      getComputedStyle(document.documentElement).getPropertyValue("--color-0").trim() ??
      "#111111";
    const fallbackLineColor =
      styleStore.style.value["--color-2"] ??
      getComputedStyle(document.documentElement).getPropertyValue("--color-2").trim() ??
      "#333333";
    const nextBoard = toRPetaBoard(
      createPetaBoard(
        name,
        Math.max(0, ...boards.map((board) => board.index)) + 1,
        fallbackFillColor || "#111111",
        fallbackLineColor || "#333333",
      ),
    );
    setBoards((current) => sortBoards([...current, nextBoard]));
    await IPC.petaBoards.update([toPetaBoard(nextBoard)], "insert");
    await selectBoard(nextBoard);
  }

  return (
    <div className={rootStyle}>
      <div className={topStyle}>
        <VTitleBar title={title}>
          <VTabBar
            boards={boards}
            currentPetaBoardId={selectedBoardId}
            onAdd={() => void addBoard()}
            onRemove={(board) => void removeBoard(board)}
            onSelect={(board) => void selectBoard(board)}
            onUpdateBoard={(board) => void saveBoard(board)}
          />
        </VTitleBar>
        <VHeaderBar>
          {currentBoard ? <VBoardProperty board={currentBoard} onUpdate={(board) => void saveBoard(board)} /> : null}
        </VHeaderBar>
      </div>
      <div className={contentStyle}>
        <VBoard board={currentBoard} onUpdateBoard={(board) => void saveBoard(board)} petaFilesById={petaFilesById} />
      </div>
      <VContextMenu />
    </div>
  );
}
