<template>
  <e-browser-root>
    <e-left>
      <VTags
        :peta-files-array="petaFilesArray"
        v-model:selected-filter-type="selectedFilterType"
        v-model:selected-peta-tag-ids="selectedPetaTagIds" />
    </e-left>
    <e-center>
      <e-content>
        <e-top>
          <e-search>
            <VSearch
              v-model:selected-peta-tag-ids="selectedPetaTagIds"
              v-model:selected-filter-type="selectedFilterType" />
          </e-search>
          <e-buttons>
            <VSelect
              :items="browserTileViewMode.map((sm) => ({ value: sm, label: sm }))"
              :min-width="'120px'"
              v-model:value="statesStore.state.value.browserTileViewMode" />
            <VSelect
              :items="sortModes.map((sm) => ({ value: sm, label: sm }))"
              :min-width="'120px'"
              v-model:value="sortMode" />
            <input type="color" tabindex="-1" v-model="currentColor" />
            <VSlider
              v-model:value="thumbnailsSize"
              @change="updateTileSize"
              :min="defines.BROWSER_THUMBNAIL_ZOOM_MIN"
              :max="defines.BROWSER_THUMBNAIL_ZOOM_MAX" />
          </e-buttons>
        </e-top>
        <e-tiles ref="thumbnails">
          <e-tiles-content
            ref="thumbsWrapper"
            :style="{ height: scrollHeight + defines.BROWSER_THUMBNAIL_MARGIN + 'px' }">
            <VTile
              v-for="data in visibleTiles"
              :key="data.id"
              :tile="data"
              :original="original"
              :parent-area-min-y="areaMinY"
              :parent-area-max-y="areaMaxY"
              @select="selectTile"
              @menu="
                (tile, position) => (tile.petaFile ? petaFileMenu(tile.petaFile, position) : 0)
              "
              @drag="drag"
              @dblclick="openDetail" />
          </e-tiles-content>
        </e-tiles>
      </e-content>
    </e-center>
    <e-right>
      <VPreview
        :peta-files="selectedPetaFiles"
        @clear-selection-all="clearSelectionAll"
        @menu="petaFileMenu"
        @drag="drag" />
      <VProperty :peta-files="selectedPetaFiles" @select-tag="selectTag" />
    </e-right>
  </e-browser-root>
</template>

<script setup lang="ts">
import { debounce, throttle } from "throttle-debounce";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSearch from "@/renderer/components/browser/search/VSearch.vue";
import VTags from "@/renderer/components/browser/tags/VTags.vue";
import VTile from "@/renderer/components/browser/tile/VTile.vue";
import VPreview from "@/renderer/components/commons/property/VPreview.vue";
import VProperty from "@/renderer/components/commons/property/VProperty.vue";
import VSelect from "@/renderer/components/commons/utils/select/VSelect.vue";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider.vue";

import { RPetaFile } from "@/commons/datas/rPetaFile";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import { realESRGANModelNames } from "@/commons/datas/realESRGANModelName";
import { browserTileViewMode } from "@/commons/datas/states";
import { UpdateMode } from "@/commons/datas/updateMode";
import {
  BROWSER_THUMBNAILS_SELECTION_PERCENT,
  BROWSER_THUMBNAIL_MARGIN,
  BROWSER_THUMBNAIL_SIZE,
  BROWSER_THUMBNAIL_ZOOM_MAX,
  BROWSER_THUMBNAIL_ZOOM_MIN,
} from "@/commons/defines";
import { ciede, hex2rgb } from "@/commons/utils/colors";
import { Vec2 } from "@/commons/utils/vec2";

import { FilterType } from "@/renderer/components/browser/filterType";
import { Tile } from "@/renderer/components/browser/tile/tile";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import * as ImageDecoder from "@/renderer/libs/serialImageDecoder";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useDefinesStore } from "@/renderer/stores/definesStore/useDefinesStore";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useStateStore } from "@/renderer/stores/statesStore/useStatesStore";
import { isKeyboardLocked } from "@/renderer/utils/isKeyboardLocked";

const statesStore = useStateStore();
const settingsStore = useSettingsStore();
const components = useComponentsStore();
const petaFilesStore = usePetaFilesStore();
const petaTagsStore = usePetaTagsStore();
const { t } = useI18n();
const thumbnails = ref<HTMLDivElement>();
const thumbsWrapper = ref<HTMLDivElement>();
const selectedPetaTagIds = ref<string[]>([]);
const selectedFilterType = ref<FilterType>(FilterType.ALL);
const thumbnailsWidth = ref(0);
const areaMaxY = ref(0);
const areaMinY = ref(0);
const areaPreVisibleMaxY = ref(0);
const areaPreVisibleMinY = ref(0);
const scrollAreaHeight = ref(0);
const sortModes = ["ADD_DATE", "COLOR_NUM", "SIMILAR"] as const;
const sortMode = ref<(typeof sortModes)[number]>("ADD_DATE");
const thumbnailsResizerStore = useResizerStore();
const scrollAreaResizerStore = useResizerStore();
const firstSelectedTile = ref<Tile>();
const thumbnailsSize = ref(0);
const currentScrollTileId = ref("");
const currentScrollTileOffset = ref(0);
const keyboards = useKeyboardsStore();
const defines = useDefinesStore().defines;
const filteredPetaFiles = ref<RPetaFile[]>([]);
const ignoreScrollEvent = ref(false);
const currentColor = ref("#ffffff");
const fetchFilteredPetaFilesThrottle = throttle(100, (reload: boolean) =>
  fetchFilteredPetaFiles(reload),
);
const fetchFilteredPetaFilesDebounce = debounce(100, (reload: boolean) =>
  fetchFilteredPetaFiles(reload),
);
onMounted(() => {
  thumbnails.value?.addEventListener("scroll", updateScrollArea);
  thumbnails.value?.addEventListener("wheel", mouseWheel);
  thumbnailsResizerStore.observe(thumbsWrapper.value);
  scrollAreaResizerStore.observe(thumbnails.value);
  thumbnailsResizerStore.on("resize", resizeImages);
  scrollAreaResizerStore.on("resize", resizeScrollArea);
  thumbnailsSize.value = statesStore.state.value.browserTileSize;
  keyboards.enabled = true;
  keyboards.keys("KeyA").down(keyA);
  fetchFilteredPetaFiles();
  petaFilesStore.onUpdate((petaFiles, mode) => {
    if (mode === UpdateMode.INSERT) {
      selectedPetaTagIds.value = [];
      selectedFilterType.value = FilterType.ALL;
    }
  });
});
onUnmounted(() => {
  thumbnails.value?.removeEventListener("scroll", updateScrollArea);
  thumbnails.value?.removeEventListener("wheel", mouseWheel);
});
function mouseWheel(e: WheelEvent) {
  if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
    thumbnailsSize.value -= e.deltaY * settingsStore.state.value.zoomSensitivity * 0.001;
    thumbnailsSize.value = Math.floor(thumbnailsSize.value);
    if (thumbnailsSize.value < BROWSER_THUMBNAIL_ZOOM_MIN) {
      thumbnailsSize.value = BROWSER_THUMBNAIL_ZOOM_MIN;
    } else if (thumbnailsSize.value > BROWSER_THUMBNAIL_ZOOM_MAX) {
      thumbnailsSize.value = BROWSER_THUMBNAIL_ZOOM_MAX;
    }
  }
}
function saveScrollPosition() {
  let minDistance = Infinity;
  tiles.value.forEach((t) => {
    if (t.petaFile === undefined || thumbnails.value === undefined) {
      return;
    }
    const offset = thumbnails.value.scrollTop - t.position.y;
    const distance = Math.abs(offset);
    if (distance < minDistance) {
      minDistance = distance;
      currentScrollTileOffset.value = offset;
      currentScrollTileId.value = t.petaFile.id;
    }
  });
}

function restoreScrollPosition() {
  const current = tiles.value.find((bt) => bt.petaFile?.id === currentScrollTileId.value);
  if (current) {
    ignoreScrollEvent.value = true;
    thumbnails.value?.scrollTo(0, current.position.y + currentScrollTileOffset.value);
  }
}
function updateScrollArea(event?: Event, resize = false) {
  const preVisibleOffset = scrollAreaHeight.value * 0.5;
  const visibleOffset = scrollAreaHeight.value * 0;
  if (thumbnails.value === undefined) {
    return;
  }
  areaMinY.value = thumbnails.value.scrollTop - visibleOffset;
  areaMaxY.value = scrollAreaHeight.value + thumbnails.value.scrollTop + visibleOffset;
  areaPreVisibleMinY.value = thumbnails.value.scrollTop - preVisibleOffset;
  areaPreVisibleMaxY.value = scrollAreaHeight.value + thumbnails.value.scrollTop + preVisibleOffset;
  if (resize) {
    return;
  }
  if (ignoreScrollEvent.value) {
    ignoreScrollEvent.value = false;
    return;
  }
  if (scrollAreaHeight.value && event) {
    saveScrollPosition();
  }
}
function resizeScrollArea(rect: DOMRectReadOnly) {
  const areaHeight = rect.height;
  scrollAreaHeight.value = areaHeight;
  restoreScrollPosition();
  updateScrollArea(undefined, true);
}
function resizeImages(rect: DOMRectReadOnly) {
  thumbnailsWidth.value = rect.width - BROWSER_THUMBNAIL_MARGIN;
}
function drag(petaFile: RPetaFile) {
  if (
    !Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    ) &&
    !petaFile.renderer.selected
  ) {
    clearSelectionAll();
  }
  const petaFiles = petaFile.renderer.selected ? [] : [petaFile];
  petaFiles.push(...selectedPetaFiles.value);
  IPC.send("startDrag", petaFiles, actualTileSize.value, "");
}
function selectTile(thumb: Tile, force = false) {
  if (thumb.petaFile === undefined) {
    return;
  }
  if (
    selectedPetaFiles.value.length < 1 ||
    !Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    )
  ) {
    // 最初の選択、又は修飾キーなしの場合、最初の選択を保存する
    firstSelectedTile.value = thumb;
  }
  if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
    // 選択サムネイルを反転
    thumb.petaFile.renderer.selected = !thumb.petaFile.renderer.selected || force;
  } else {
    // コントロールキーが押されていなければ選択をリセット
    petaFilesStore.clearSelection();
    thumb.petaFile.renderer.selected = true;
  }
  if (firstSelectedTile.value && Keyboards.pressedOR("ShiftLeft", "ShiftRight")) {
    // 最初の選択と、シフトキーが押されていれば、範囲選択。
    const topLeft = new Vec2(
      Math.min(firstSelectedTile.value.position.x, thumb.position.x),
      Math.min(firstSelectedTile.value.position.y, thumb.position.y),
    );
    const size = new Vec2(
      Math.max(
        firstSelectedTile.value.position.x + firstSelectedTile.value.width,
        thumb.position.x + thumb.width,
      ),
      Math.max(
        firstSelectedTile.value.position.y + firstSelectedTile.value.height,
        thumb.position.y + thumb.height,
      ),
    )
      .clone()
      .sub(topLeft);
    tiles.value.forEach((pt) => {
      if (pt.petaFile === undefined) {
        return;
      }
      const widthDiff = Math.min(
        pt.width / 2 +
          size.x / 2 -
          Math.abs(pt.position.x + pt.width / 2 - (topLeft.x + size.x / 2)),
        pt.width,
      );
      const heightDiff = Math.min(
        pt.height / 2 +
          size.y / 2 -
          Math.abs(pt.position.y + pt.height / 2 - (topLeft.y + size.y / 2)),
        pt.height,
      );
      const hitArea = widthDiff * heightDiff;
      const ptArea = pt.width * pt.height;
      if (
        widthDiff > 0 &&
        heightDiff > 0 &&
        hitArea / ptArea >
          (statesStore.state.value.browserTileViewMode === "fill2"
            ? 0
            : BROWSER_THUMBNAILS_SELECTION_PERCENT)
      ) {
        pt.petaFile.renderer.selected = true;
      }
    });
  }
}
function clearSelectionAll() {
  petaFilesArray.value.forEach((pi) => {
    pi.renderer.selected = false;
  });
}
function petaFileMenu(petaFile: RPetaFile, position: Vec2) {
  if (!petaFile.renderer.selected) {
    const tile = tiles.value.find((tile) => tile.petaFile?.id === petaFile.id);
    if (tile) {
      selectTile(tile, true);
    }
  }
  components.contextMenu.open(
    [
      {
        label: t("browser.petaFileMenu.remove", [selectedPetaFiles.value.length]),
        click: async () => {
          if (
            (await IPC.send(
              "openModal",
              t("browser.removeImageDialog", [selectedPetaFiles.value.length]),
              [t("commons.yes"), t("commons.no")],
            )) === 0
          ) {
            petaFilesStore.updatePetaFiles(selectedPetaFiles.value, UpdateMode.REMOVE);
          }
        },
      },
      {
        label: t("browser.petaFileMenu.openFile"),
        click: async () => {
          await IPC.send("openFile", petaFile);
        },
      },
      ...realESRGANModelNames.map((modelName) => {
        return {
          label: `${t("browser.petaFileMenu.realESRGAN")}(${modelName})`,
          click: async () => {
            await IPC.send("realESRGANConvert", selectedPetaFiles.value, modelName);
          },
        };
      }),
      {
        label: t("browser.petaFileMenu.searchImageByGoogle"),
        click: async () => {
          await IPC.send("searchImageByGoogle", petaFile);
        },
      },
    ],
    position,
  );
}
async function openDetail(petaFile: RPetaFile) {
  if (
    Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    )
  ) {
    return;
  }
  await IPC.send("setDetailsPetaFile", petaFile.id);
  await IPC.send("openWindow", "details");
}
function updateTileSize(value: number) {
  statesStore.state.value.browserTileSize = value;
}
let ciedeCache: { [key: string]: number } = {};
function sort(a: RPetaFile, b: RPetaFile) {
  switch (sortMode.value) {
    case "ADD_DATE": {
      if (a.addDate === b.addDate) {
        return b.fileDate - a.fileDate;
      }
      return b.addDate - a.addDate;
    }
    case "COLOR_NUM": {
      return b.metadata.palette.length - a.metadata.palette.length;
    }
    case "SIMILAR": {
      const rgb = hex2rgb(currentColor.value);
      const ciedeA = ciedeCache[a.id] ?? (ciedeCache[a.id] = calcCiedeFromPalette(a, rgb));
      const ciedeB = ciedeCache[b.id] ?? (ciedeCache[b.id] = calcCiedeFromPalette(b, rgb));
      return ciedeA - ciedeB;
    }
  }
}
function calcCiedeFromPalette(petaFile: RPetaFile, rgb: { r: number; g: number; b: number }) {
  const populations = petaFile.metadata.palette.reduce((num, color) => num + color.population, 0);
  return Math.min(
    ...petaFile.metadata.palette
      .filter((pc) => pc.population / populations > 0.2)
      .map((pc) => ciede(pc, rgb)),
  );
}
const fetchFilteredPetaFiles = (() => {
  let fetchId = 0;
  let results: string[] = [];
  return async (reload = true) => {
    const currentFetchId = ++fetchId;
    console.time("fetch" + currentFetchId);
    if (reload) {
      const newResults = await IPC.send(
        "getPetaFileIds",
        selectedFilterType.value === FilterType.UNTAGGED
          ? { type: "untagged" }
          : selectedFilterType.value === FilterType.TAGS && selectedPetaTagIds.value.length > 0
          ? { type: "petaTag", petaTagIds: selectedPetaTagIds.value }
          : { type: "all" },
      );
      results = newResults;
    }
    console.timeEnd("fetch" + currentFetchId);
    if (currentFetchId !== fetchId) {
      return;
    }
    ciedeCache = {};
    filteredPetaFiles.value = (
      Array.from(
        new Set(
          results
            .map((id) => {
              return petaFilesStore.state.value[id];
            })
            .filter((petaFile) => {
              return petaFile;
            }),
        ),
      ) as RPetaFile[]
    ).sort(sort);
  };
})();
function selectTag(tag: RPetaTag) {
  selectedPetaTagIds.value = [tag.id];
  selectedFilterType.value === FilterType.TAGS;
}
function updateVisibility(tile: Tile) {
  tile.visible =
    (areaMinY.value < tile.position.y && tile.position.y < areaMaxY.value) ||
    (areaMinY.value < tile.position.y + tile.height &&
      tile.position.y + tile.height < areaMaxY.value) ||
    (areaMinY.value > tile.position.y && tile.position.y + tile.height > areaMaxY.value);
  tile.preVisible =
    (areaPreVisibleMinY.value < tile.position.y && tile.position.y < areaPreVisibleMaxY.value) ||
    (areaPreVisibleMinY.value < tile.position.y + tile.height &&
      tile.position.y + tile.height < areaPreVisibleMaxY.value) ||
    (areaPreVisibleMinY.value > tile.position.y &&
      tile.position.y + tile.height > areaPreVisibleMaxY.value);
}
function keyA() {
  if (isKeyboardLocked()) {
    return;
  }
  if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
    clearSelectionAll();
    filteredPetaFiles.value.forEach((pi) => {
      pi.renderer.selected = true;
    });
  }
}
const petaFilesArray = computed(() => Object.values(petaFilesStore.state.value));
const selectedPetaFiles = computed(() => petaFilesArray.value.filter((pi) => pi.renderer.selected));
const thumbnailsRowCount = computed(() => {
  const c = Math.floor(thumbnailsWidth.value / thumbnailsSize.value);
  if (c < 1) {
    return 1;
  }
  return c;
});
const actualTileSize = computed(() => thumbnailsWidth.value / thumbnailsRowCount.value);
const scrollHeight = computed(() => {
  return tiles.value
    .map((tile) => {
      return tile.position.y + tile.height;
    })
    .reduce((a, b) => {
      return a > b ? a : b;
    }, 0);
});
const tiles = computed((): Tile[] => {
  if (actualTileSize.value === 0) {
    return [];
  }
  const yList: number[] = [];
  for (let i = 0; i < thumbnailsRowCount.value; i++) {
    yList.push(0);
  }
  const tiles: Tile[] = [];
  filteredPetaFiles.value.map((p, i) => {
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    let mvi = 0;
    yList.forEach((y, vi) => {
      if (minY > y) {
        minY = y;
        mvi = vi;
      }
      if (maxY < y) {
        maxY = y;
      }
    });
    if (
      i % thumbnailsRowCount.value === 0 &&
      statesStore.state.value.browserTileViewMode === "fill2"
    ) {
      yList.fill(maxY);
      mvi = 0;
    }
    const position = new Vec2(
      mvi * actualTileSize.value + BROWSER_THUMBNAIL_MARGIN,
      (yList[mvi] || 0) + BROWSER_THUMBNAIL_MARGIN,
    );
    const height = (p.metadata.height / p.metadata.width) * actualTileSize.value;
    yList[mvi] += height;
    const tile: Tile = {
      petaFile: p,
      position: position,
      width: actualTileSize.value - BROWSER_THUMBNAIL_MARGIN,
      height: height - BROWSER_THUMBNAIL_MARGIN,
      visible: false,
      preVisible: false,
      id: p.id,
    };
    updateVisibility(tile);
    tiles.push(tile);
  });
  return tiles;
});
const visibleTiles = computed(() => tiles.value.filter((p) => p.preVisible));
const original = computed(
  () =>
    settingsStore.state.value.loadTilesInOriginal && actualTileSize.value > BROWSER_THUMBNAIL_SIZE,
);
watch(filteredPetaFiles, () => {
  ImageDecoder.clear();
});
watch([selectedPetaTagIds, selectedFilterType, sortMode], () => {
  currentScrollTileId.value = "";
  nextTick(() => {
    if (thumbnails.value) {
      thumbnails.value.scrollTo(0, 0);
    }
  });
  fetchFilteredPetaFilesDebounce(true);
});
watch(petaFilesArray, () => fetchFilteredPetaFilesDebounce(true));
watch(petaTagsStore.state.petaTags, () => fetchFilteredPetaFilesDebounce(true));
watch(sortMode, () => fetchFilteredPetaFilesDebounce(true));
watch(currentColor, () => {
  if (sortMode.value === "SIMILAR") {
    currentScrollTileId.value = "";
    nextTick(() => {
      if (thumbnails.value) {
        thumbnails.value.scrollTo(0, 0);
      }
    });
    fetchFilteredPetaFilesThrottle(false);
  }
});
watch(thumbnailsSize, restoreScrollPosition);
</script>

<style lang="scss" scoped>
e-browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  > e-left {
    width: 250px;
    min-width: 128px;
    display: block;
  }
  > e-right {
    width: 250px;
    min-width: 128px;
    display: flex;
    flex-direction: column;
  }
  > e-center {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    > e-content {
      width: 100%;
      height: 100%;
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      > e-top {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        > e-search {
          display: block;
          flex: 1;
          padding: 0px var(--px-2);
          min-width: 200px;
        }
        > e-buttons {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          > label {
            display: flex;
            align-items: center;
          }
        }
      }
      > e-tiles {
        width: 100%;
        position: relative;
        overflow-y: scroll;
        overflow-x: hidden;
        display: block;
        border-radius: var(--px-2);
        > e-tiles-content {
          display: block;
        }
      }
    }
  }
}
</style>
