<template>
  <t-browser-root>
    <t-left>
      <VTags
        :petaImagesArray="petaImagesArray"
        v-model:selectedFilterType="selectedFilterType"
        v-model:selectedPetaTagIds="selectedPetaTagIds" />
    </t-left>
    <t-center>
      <t-content>
        <t-top>
          <t-search>
            <VSearch
              v-model:selectedPetaTagIds="selectedPetaTagIds"
              v-model:selectedFilterType="selectedFilterType" />
          </t-search>
          <t-buttons>
            <label>
              <input
                type="checkbox"
                :checked="statesStore.state.value.groupingByDate"
                @change="
                  statesStore.state.value.groupingByDate = Boolean(
                    ($event.target as HTMLInputElement).checked,
                  )
                " />
              <span>{{ t("browser.grouping") }}</span>
            </label>
            <select v-model="sortMode">
              <option v-for="sm in sortModes" :key="sm" :value="sm">{{ sm }}</option>
            </select>
            <input type="color" v-model="currentColor" />
            <input
              type="range"
              v-model="thumbnailsSize"
              tabindex="-1"
              @change="updateTileSize(Number(($event.target as HTMLInputElement).value))"
              :min="defines.BROWSER_THUMBNAIL_ZOOM_MIN"
              :max="defines.BROWSER_THUMBNAIL_ZOOM_MAX"
              :step="defines.BROWSER_THUMBNAIL_ZOOM_STEP" />
          </t-buttons>
        </t-top>
        <t-tiles ref="thumbnails">
          <t-tiles-content
            ref="thumbsWrapper"
            :style="{ height: scrollHeight + defines.BROWSER_THUMBNAIL_MARGIN + 'px' }">
            <VTile
              v-for="data in visibleTiles"
              :key="data.id"
              :tile="data"
              :original="original"
              :parentAreaMinY="areaMinY"
              :parentAreaMaxY="areaMaxY"
              @select="selectTile"
              @menu="
                (tile, position) => (tile.petaImage ? petaImageMenu(tile.petaImage, position) : 0)
              "
              @drag="drag"
              @dblclick="openDetail" />
          </t-tiles-content>
        </t-tiles>
      </t-content>
    </t-center>
    <t-right>
      <VPreview
        :petaImages="selectedPetaImages"
        @clearSelectionAll="clearSelectionAll"
        @menu="petaImageMenu"
        @drag="drag" />
      <VProperty :petaImages="selectedPetaImages" @selectTag="selectTag" />
    </t-right>
  </t-browser-root>
</template>

<script setup lang="ts">
// Vue
import { throttle } from "throttle-debounce";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSearch from "@/renderer/components/browser/search/VSearch.vue";
import VTags from "@/renderer/components/browser/tags/VTags.vue";
import VTile from "@/renderer/components/browser/tile/VTile.vue";
import VPreview from "@/renderer/components/commons/property/VPreview.vue";
import VProperty from "@/renderer/components/commons/property/VProperty.vue";

import { RPetaImage } from "@/commons/datas/rPetaImage";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import { realESRGANModelNames } from "@/commons/datas/realESRGANModelName";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowType } from "@/commons/datas/windowType";
import {
  BROWSER_THUMBNAIL_MARGIN,
  BROWSER_THUMBNAIL_SIZE,
  BROWSER_THUMBNAIL_ZOOM_MAX,
  BROWSER_THUMBNAIL_ZOOM_MIN,
  THUMBNAILS_SELECTION_PERCENT,
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
import { usePetaImagesStore } from "@/renderer/stores/petaImagesStore/usePetaImagesStore";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useStateStore } from "@/renderer/stores/statesStore/useStatesStore";
import { isKeyboardLocked } from "@/renderer/utils/isKeyboardLocked";

const statesStore = useStateStore();
const settingsStore = useSettingsStore();
const components = useComponentsStore();
const petaImagesStore = usePetaImagesStore();
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
const sortMode = ref<typeof sortModes[number]>("ADD_DATE");
const thumbnailsResizerStore = useResizerStore();
const scrollAreaResizerStore = useResizerStore();
const firstSelectedTile = ref<Tile>();
const thumbnailsSize = ref(0);
const currentScrollTileId = ref("");
const currentScrollTileOffset = ref(0);
const keyboards = useKeyboardsStore();
const defines = useDefinesStore().defines;
const filteredPetaImages = ref<RPetaImage[]>([]);
const ignoreScrollEvent = ref(false);
const currentColor = ref("#ffffff");
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
  fetchFilteredPetaImages();
  petaImagesStore.onUpdate((petaImages, mode) => {
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
    if (t.petaImage === undefined || thumbnails.value === undefined) {
      return;
    }
    const offset = thumbnails.value.scrollTop - t.position.y;
    const distance = Math.abs(offset);
    if (distance < minDistance) {
      minDistance = distance;
      currentScrollTileOffset.value = offset;
      currentScrollTileId.value = t.petaImage.id;
    }
  });
}

function restoreScrollPosition() {
  const current = tiles.value.find((bt) => bt.petaImage?.id === currentScrollTileId.value);
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
function drag(petaImage: RPetaImage) {
  if (
    !Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    ) &&
    !petaImage.renderer.selected
  ) {
    clearSelectionAll();
  }
  const petaImages = petaImage.renderer.selected ? [] : [petaImage];
  petaImages.push(...selectedPetaImages.value);
  IPC.send("startDrag", petaImages, actualTileSize.value, "");
}
function selectTile(thumb: Tile, force = false) {
  if (thumb.petaImage === undefined) {
    return;
  }
  if (
    selectedPetaImages.value.length < 1 ||
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
    thumb.petaImage.renderer.selected = !thumb.petaImage.renderer.selected || force;
  } else {
    // コントロールキーが押されていなければ選択をリセット
    petaImagesStore.clearSelection();
    thumb.petaImage.renderer.selected = true;
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
      if (pt.petaImage === undefined) {
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
      if (widthDiff > 0 && heightDiff > 0 && hitArea / ptArea > THUMBNAILS_SELECTION_PERCENT) {
        pt.petaImage.renderer.selected = true;
      }
    });
  }
}
function clearSelectionAll() {
  petaImagesArray.value.forEach((pi) => {
    pi.renderer.selected = false;
  });
}
function petaImageMenu(petaImage: RPetaImage, position: Vec2) {
  if (!petaImage.renderer.selected) {
    const tile = tiles.value.find((tile) => tile.petaImage?.id === petaImage.id);
    if (tile) {
      selectTile(tile, true);
    }
  }
  components.contextMenu.open(
    [
      {
        label: t("browser.petaImageMenu.remove", [selectedPetaImages.value.length]),
        click: async () => {
          if (
            (await components.dialog.show(
              t("browser.removeImageDialog", [selectedPetaImages.value.length]),
              [t("commons.yes"), t("commons.no")],
            )) === 0
          ) {
            petaImagesStore.updatePetaImages(selectedPetaImages.value, UpdateMode.REMOVE);
          }
        },
      },
      {
        label: t("browser.petaImageMenu.openImageFile"),
        click: async () => {
          await IPC.send("openImageFile", petaImage);
        },
      },
      ...realESRGANModelNames.map((modelName) => {
        return {
          label: `${t("browser.petaImageMenu.realESRGAN")}(${modelName})`,
          click: async () => {
            await IPC.send("realESRGANConvert", selectedPetaImages.value, modelName);
          },
        };
      }),
      {
        label: t("browser.petaImageMenu.searchImageByGoogle"),
        click: async () => {
          await IPC.send("searchImageByGoogle", petaImage);
        },
      },
    ],
    position,
  );
}
async function openDetail(petaImage: RPetaImage) {
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
  await IPC.send("setDetailsPetaImage", petaImage.id);
  await IPC.send("openWindow", WindowType.DETAILS);
}
function updateTileSize(value: number) {
  statesStore.state.value.browserTileSize = value;
}
let ciedeCache: { [key: string]: number } = {};
function sort(a: RPetaImage, b: RPetaImage) {
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
function calcCiedeFromPalette(petaImage: RPetaImage, rgb: { r: number; g: number; b: number }) {
  const populations = petaImage.metadata.palette.reduce((num, color) => num + color.population, 0);
  return Math.min(
    ...petaImage.metadata.palette
      .filter((pc) => pc.population / populations > 0.2)
      .map((pc) => ciede(pc, rgb)),
  );
}
const fetchFilteredPetaImages = (() => {
  let fetchId = 0;
  return async () => {
    const currentFetchId = ++fetchId;
    console.time("fetch" + currentFetchId);
    const results = await IPC.send(
      "getPetaImageIds",
      selectedFilterType.value === FilterType.UNTAGGED
        ? { type: "untagged" }
        : selectedFilterType.value === FilterType.TAGS && selectedPetaTagIds.value.length > 0
        ? { type: "petaTag", petaTagIds: selectedPetaTagIds.value }
        : { type: "all" },
    );
    console.timeEnd("fetch" + currentFetchId);
    if (currentFetchId !== fetchId) {
      return;
    }
    ciedeCache = {};
    filteredPetaImages.value = (
      Array.from(
        new Set(
          results
            .map((id) => {
              return petaImages.value[id];
            })
            .filter((petaImage) => {
              return petaImage;
            }),
        ),
      ) as RPetaImage[]
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
    filteredPetaImages.value.forEach((pi) => {
      pi.renderer.selected = true;
    });
  }
}
const petaImages = computed(() => petaImagesStore.state.value);
const petaImagesArray = computed(() => Object.values(petaImages.value));
const selectedPetaImages = computed(() =>
  petaImagesArray.value.filter((pi) => pi.renderer.selected),
);
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
  let prevDateString = "";
  const tiles: Tile[] = [];
  filteredPetaImages.value.map((p) => {
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
    let newGroup = false;
    const date = new Date(p.addDate);
    const currentDateString =
      date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
    if (prevDateString != currentDateString && statesStore.state.value.groupingByDate) {
      prevDateString = currentDateString;
      mvi = 0;
      minY = maxY;
      yList.fill(minY);
      newGroup = true;
    }
    if (newGroup) {
      const height = 32;
      const position = new Vec2(0, (yList[mvi] || 0) + BROWSER_THUMBNAIL_MARGIN);
      yList.fill(minY + height);
      const tile: Tile = {
        position: position,
        width: thumbnailsWidth.value,
        height: height,
        visible: false,
        preVisible: false,
        group: currentDateString,
        id: currentDateString,
      };
      updateVisibility(tile);
      tiles.push(tile);
    }
    const position = new Vec2(
      mvi * actualTileSize.value + BROWSER_THUMBNAIL_MARGIN,
      (yList[mvi] || 0) + BROWSER_THUMBNAIL_MARGIN,
    );
    const height = (p.metadata.height / p.metadata.width) * actualTileSize.value;
    yList[mvi] += height;
    const tile: Tile = {
      petaImage: p,
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
watch(filteredPetaImages, () => {
  ImageDecoder.clear();
});
watch([selectedPetaTagIds, selectedFilterType, sortMode], () => {
  currentScrollTileId.value = "";
  nextTick(() => {
    if (thumbnails.value) {
      thumbnails.value.scrollTo(0, 0);
    }
  });
  fetchFilteredPetaImages();
});
watch(petaImagesArray, fetchFilteredPetaImages);
watch(petaTagsStore.state.petaTags, fetchFilteredPetaImages);
watch(sortMode, fetchFilteredPetaImages);
const f = throttle(100, fetchFilteredPetaImages);
watch(currentColor, () => {
  currentScrollTileId.value = "";
  nextTick(() => {
    if (thumbnails.value) {
      thumbnails.value.scrollTo(0, 0);
    }
  });
  if (sortMode.value === "SIMILAR") {
    f();
  }
});
watch(thumbnailsSize, restoreScrollPosition);
</script>

<style lang="scss" scoped>
t-browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  > t-left {
    padding: var(--px-2);
    width: 250px;
    min-width: 250px;
    display: block;
  }
  > t-center {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    padding: var(--px-2);
    > t-content {
      width: 100%;
      height: 100%;
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      > t-top {
        width: 100%;
        display: flex;
        padding: 0px 0px var(--px-2) 0px;
        > t-search {
          display: block;
          flex: 1;
          padding: 0px var(--px-2);
        }
        > t-buttons {
          display: flex;
          align-items: center;
          > label {
            display: flex;
            align-items: center;
          }
        }
      }
      > t-tiles {
        width: 100%;
        position: relative;
        overflow-y: scroll;
        overflow-x: hidden;
        display: block;
        border-radius: var(--px-2);
        > t-tiles-content {
          display: block;
        }
      }
    }
  }
  > t-right {
    width: 250px;
    min-width: 250px;
    padding: var(--px-2);
    display: flex;
    flex-direction: column;
  }
}
</style>
