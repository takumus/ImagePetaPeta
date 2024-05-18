import * as PIXI from "pixi.js";
import { Ref, ref } from "vue";

import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";
import { Vec2 } from "@/commons/utils/vec2";

import { VBoardLoadingStatus } from "@/renderer/components/board/loading/vBoardLoadingStatus";
import { PPetaPanel } from "@/renderer/components/board/pPetaPanels/pPetaPanel";
import { PTransformer } from "@/renderer/components/board/pPetaPanels/pTransformer";
import { Keyboards } from "@/renderer/libs/keyboards";
import { logChunk } from "@/renderer/libs/rendererLogger";
import { useCommonTextureStore } from "@/renderer/stores/commonTextureStore/useCommonTextureStore";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { useStateStore } from "@/renderer/stores/statesStore/useStatesStore";
import * as Cursor from "@/renderer/utils/cursor";
import { isKeyboardLocked } from "@/renderer/utils/isKeyboardLocked";

export function initBoardLoader(
  pPanelsContainer: PIXI.Container,
  pTransformer: PTransformer,
  currentBoard: Ref<RPetaBoard | undefined>,
  onUpdateGif: () => void,
  orderPIXIRender: () => void,
  updatePetaBoard: () => void,
) {
  const statesStore = useStateStore();
  const petaFilesStore = usePetaFilesStore();
  const commonTextureStore = useCommonTextureStore();
  const nsfwStore = useNSFWStore();
  const loadingStatus = ref<VBoardLoadingStatus>({
    loading: false,
    extracting: false,
    loadProgress: 0,
    extractProgress: 0,
    log: "",
  });
  let pPanels: { [key: string]: PPetaPanel } = {};
  let cancelExtract: (() => Promise<void>) | undefined;
  pTransformer.pPanels = pPanels;
  async function load(params: {
    reload?: {
      additions: string[];
      deletions: string[];
    };
  }): Promise<void> {
    const log = logChunk().debug;
    // endCrop();
    // リロードじゃないならクリア。
    if (params.reload === undefined) {
      pPanelsArray().forEach(removePPetaPanel);
      pTransformer.pPanels = pPanels = {};
    }
    if (currentBoard.value === undefined) {
      return;
    }
    const petaPanels = Object.values(currentBoard.value.petaPanels);
    if (
      params.reload &&
      params.reload.additions.length === 0 &&
      params.reload.deletions.length === 0
    ) {
      petaPanels.forEach((petaPanel) => {
        const pPanel = pPanels[petaPanel.id];
        if (pPanel) {
          pPanel.petaPanel = petaPanel;
        }
      });
      return;
    }
    Cursor.setCursor("wait");
    loadingStatus.value.extracting = true;
    loadingStatus.value.loading = true;
    loadingStatus.value.loadProgress = 0;
    loadingStatus.value.extractProgress = 0;
    if (cancelExtract !== undefined) {
      log("vBoard", `canceling loading`);
      pPanelsArray().forEach((pPanel) => pPanel.destroy());
      await cancelExtract();
      log("vBoard", `canceled loading`);
      return load(params);
    }
    if (petaPanels.length === 0) {
      loadingStatus.value.extracting = false;
      loadingStatus.value.loading = false;
      Cursor.setDefaultCursor();
      statesStore.state.value.loadedPetaBoardId = currentBoard.value.id;
      return;
    }
    log("vBoard", `load(${params.reload ? "reload" : "full"})`, minimizeID(currentBoard.value.id));
    let loaded = 0;
    const extract = async (petaPanel: RPetaPanel, index: number) => {
      if (currentBoard.value === undefined) {
        return;
      }
      const progress = `${index + 1}/${petaPanels.length}`;
      let loadResult = "";
      try {
        const onLoaded = (petaPanel: RPetaPanel, error?: unknown) => {
          loaded++;
          if (currentBoard.value) {
            // if (!petaPanel.gif.stopped) {
            //   pPanels[petaPanel.id]?.playGIF();
            // }
            loadingStatus.value.loadProgress = Math.floor((loaded / petaPanels.length) * 100);
            const progress = `${loaded}/${petaPanels.length}`;
            log(
              "vBoard",
              `loaded[${error ?? "success"}](${minimizeID(petaPanel.petaFileId)}):`,
              progress,
            );
            loadingStatus.value.log =
              `load complete   (${minimizeID(petaPanel.petaFileId)}):${progress}\n` +
              loadingStatus.value.log;
            if (loaded === petaPanels.length) {
              loadingStatus.value.loading = false;
            }
          }
        };
        let pPanel = pPanels[petaPanel.id];
        if (pPanel === undefined) {
          // pPanelが無ければ作成。
          pPanel = pPanels[petaPanel.id] = new PPetaPanel(
            petaPanel,
            petaFilesStore,
            commonTextureStore,
            onUpdateGif,
          );
          pPanel.setZoomScale(currentBoard.value?.transform.scale || 1);
          pPanel.showNSFW = nsfwStore.state.value;
          pPanelsContainer.addChild(pPanel);
          pPanel.orderRender();
          orderPIXIRender();
          (async () => {
            let error: unknown;
            try {
              await pPanel.load();
            } catch (err) {
              error = err;
            }
            pPanel.orderRender();
            orderPIXIRender();
            onLoaded(petaPanel, error);
          })();
          await new Promise((res) => {
            setTimeout(res);
          });
          loadResult = "create";
        } else if (params.reload && params.reload.deletions.includes(petaPanel.petaFileId)) {
          // petaFileが無ければnoImageに。
          pPanel.noImage = true;
          loadResult = "delete";
          onLoaded(petaPanel);
        } else if (
          params.reload &&
          pPanel.noImage &&
          params.reload.additions.includes(petaPanel.petaFileId)
        ) {
          // pPanelはあるが、noImageだったら再ロードトライ。
          (async () => {
            let error: unknown;
            try {
              await pPanel.load();
            } catch (err) {
              error = err;
            }
            pPanel.orderRender();
            orderPIXIRender();
            onLoaded(petaPanel, error);
          })();
          await new Promise((res) => {
            setTimeout(res);
          });
          loadResult = "reload";
        } else {
          onLoaded(petaPanel);
          loadResult = "skip";
        }
        log("vBoard", `extracted[${loadResult}](${minimizeID(petaPanel.petaFileId)}):`, progress);
        loadingStatus.value.log =
          `extract complete(${minimizeID(petaPanel.petaFileId)}):${progress}\n` +
          loadingStatus.value.log;
      } catch (error) {
        log("vBoard", `extract error(${minimizeID(petaPanel.petaFileId)}):`, progress, error);
        loadingStatus.value.log =
          `extract error   (${minimizeID(petaPanel.petaFileId)}):${progress}\n` +
          loadingStatus.value.log;
      }
      loadingStatus.value.extractProgress = ((index + 1) / petaPanels.length) * 100;
    };
    const extraction = ppa(extract, petaPanels);
    cancelExtract = extraction.cancel;
    try {
      await extraction.promise;
    } catch (error) {
      log("vBoard", "load error:", error);
    }
    loadingStatus.value.extracting = false;
    loadingStatus.value.log = "";
    cancelExtract = undefined;
    log("vBoard", "load complete");
    sortIndex();
    Cursor.setDefaultCursor();
    statesStore.state.value.loadedPetaBoardId = currentBoard.value.id;
  }
  function clearSelectionAll(force = false) {
    if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
      pPanelsArray().forEach((pPanel) => (pPanel.petaPanel.renderer.selected = false));
    }
  }
  async function addPanel(petaPanel: RPetaPanel, offsetIndex: number, mouseOffset: Vec2) {
    if (!currentBoard.value) {
      return;
    }
    if (offsetIndex === 0) {
      clearSelectionAll();
    }
    const offset = new Vec2(20, 20).mult(offsetIndex);
    petaPanel.width *= 1 / currentBoard.value.transform.scale;
    petaPanel.height *= 1 / currentBoard.value.transform.scale;
    petaPanel.position.sub(mouseOffset);
    petaPanel.position = new Vec2(pPanelsContainer.toLocal(petaPanel.position.clone().add(offset)));
    petaPanel.index =
      Math.max(
        ...(Object.values(currentBoard.value.petaPanels) ?? []).map((petaPanel) => petaPanel.index),
      ) + 1;
    currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
    updatePetaBoard();
  }
  function removePPetaPanel(pPanel: PPetaPanel) {
    pPanelsContainer.removeChild(pPanel);
    pPanel.destroy();
    delete pPanels[pPanel.petaPanel.id];
  }
  function pPanelsArray() {
    return Object.values(pPanels);
  }
  function sortIndex() {
    if (!currentBoard.value) {
      return;
    }
    Object.values(currentBoard.value.petaPanels)
      .sort((a, b) => a.index - b.index)
      .forEach((petaPanel, i) => (petaPanel.index = i));
    pPanelsContainer.children.sort(
      (a, b) => (a as PPetaPanel).petaPanel.index - (b as PPetaPanel).petaPanel.index,
    );
    updatePetaBoard();
    orderPIXIRender();
  }
  function selectedPPetaPanels() {
    return pPanelsArray().filter(
      (pPanel) =>
        pPanel.petaPanel.renderer.selected && pPanel.petaPanel.visible && !pPanel.petaPanel.locked,
    );
  }
  function unselectedPPetaPanels() {
    return pPanelsArray().filter((pPanel) => !pPanel.petaPanel.renderer.selected);
  }
  function removeSelectedPanels() {
    if (!currentBoard.value || isKeyboardLocked()) {
      return;
    }
    selectedPPetaPanels().forEach((pPanel) => {
      removePPetaPanel(pPanel);
      if (currentBoard.value) {
        delete currentBoard.value.petaPanels[pPanel.petaPanel.id];
      }
    });
    orderPIXIRender();
    updatePetaBoard();
  }
  function getPPetaPanelFromObject(object: PIXI.Container) {
    if (!(object instanceof PPetaPanel)) {
      return undefined;
    }
    if (currentBoard.value?.petaPanels[object.petaPanel.id]) {
      return object;
    }
    return undefined;
  }
  function updatePetaPanelsFromLayer(petaPanels: RPetaPanel[]) {
    petaPanels.forEach((petaPanel) => {
      if (currentBoard.value === undefined) {
        return;
      }
      currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
    });
    load({
      reload: {
        additions: [],
        deletions: [],
      },
    });
    updatePetaBoard();
    orderPIXIRender();
  }
  function resetTransform() {
    if (!currentBoard.value) {
      return;
    }
    currentBoard.value.transform.scale = 1;
    currentBoard.value.transform.position.set(0, 0);
    orderPIXIRender();
    updatePetaBoard();
  }
  function getPPanelFromId(id: string) {
    return pPanels[id];
  }
  return {
    load,
    pPanelsArray,
    loadingStatus,
    sortIndex,
    addPanel,
    removePPetaPanel,
    cancelExtract,
    clearSelectionAll,
    selectedPPetaPanels,
    unselectedPPetaPanels,
    removeSelectedPanels,
    getPPetaPanelFromObject,
    updatePetaPanelsFromLayer,
    resetTransform,
    getPPanelFromId,
  };
}
