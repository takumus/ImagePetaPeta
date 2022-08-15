<template>
  <t-browser-root>
    <t-left>
      <VTags
        :petaImagesArray="petaImagesArray"
        :petaTagInfos="petaTagInfos"
        :selectedPetaTags="selectedPetaTags"
      />
    </t-left>
    <t-center>
      <t-content>
        <t-top>
          <t-search>
            <VSearch
              :petaTagInfos="petaTagInfos"
              :selectedPetaTags="selectedPetaTags"
            />
          </t-search>
          <t-buttons>
            <label>
              <input type="checkbox" :checked="$states.groupingByDate" @change="$states.groupingByDate = Boolean($event.target.checked)">
              <span>{{$t("browser.grouping")}}</span>
            </label>
          </t-buttons>
        </t-top>
        <t-tiles
          ref="thumbnails"
        >
          <t-tiles-content
            ref="thumbsWrapper"
            :style="{height: scrollHeight + $defines.BROWSER_THUMBNAIL_MARGIN + 'px'}"
          >
            <VTile
              v-for="(data) in visibleTiles"
              :key="data.id"
              :tile="data"
              :original="original"
              :petaTagInfos="petaTagInfos"
              :parentAreaMinY="areaMinY"
              :parentAreaMaxY="areaMaxY"
              @select="selectTile"
              @menu="petaImageMenu"
              @drag="drag"
              @dblclick="openDetail"
            />
          </t-tiles-content>
        </t-tiles>
      </t-content>
    </t-center>
    <t-right>
      <VPreview :petaImages="selectedPetaImages" />
      <VProperty
        :petaImages="selectedPetaImages"
        :petaTagInfos="petaTagInfos"
        @selectTag="selectTag"
      />
      <input
        type="range"
        v-model="thumbnailsSize"
        tabindex="-1"
        @change="updateTileSize(Number($event.target.value))"
        :min="$defines.BROWSER_THUMBNAIL_ZOOM_MIN"
        :max="$defines.BROWSER_THUMBNAIL_ZOOM_MAX"
        :step="$defines.BROWSER_THUMBNAIL_ZOOM_STEP"
      >
    </t-right>
  </t-browser-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VTile from "@/rendererProcess/components/browser/tile/VTile.vue";
import VProperty from "@/rendererProcess/components/browser/property/VProperty.vue";
import VPreview from "@/rendererProcess/components/browser/property/VPreview.vue";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import VTags from "@/rendererProcess/components/browser/tags/VTags.vue";
import VSearch from "@/rendererProcess/components/browser/search/VSearch.vue";
// Others
import { Vec2 } from "@/commons/utils/vec2";
import { API } from "@/rendererProcess/api";
import { BROWSER_THUMBNAIL_MARGIN, BROWSER_THUMBNAIL_SIZE, BROWSER_THUMBNAIL_ZOOM_MAX, BROWSER_THUMBNAIL_ZOOM_MIN, THUMBNAILS_SELECTION_PERCENT, UNTAGGED_ID } from "@/commons/defines";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { SortMode } from "@/commons/datas/sortMode";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaTag } from "@/commons/datas/petaTag";
import { isKeyboardLocked } from "@/rendererProcess/utils/isKeyboardLocked";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { getColors, getSimilarityScore2 } from "@/commons/utils/blurhashTools";
import { WindowType } from "@/commons/datas/windowType";
import deepcopy from "deepcopy";
@Options({
  components: {
    VTile,
    VProperty,
    VPreview,
    VEditableLabel,
    VModal,
    VTags,
    VSearch
  },
  emits: [
    "select",
    "addPanel"
  ]
})
export default class VBrowser extends Vue {
  @Prop()
  petaImages: PetaImages = {};
  @Prop()
  petaTagInfos: PetaTagInfo[] = [];
  @Prop()
  selectedPetaTags: PetaTag[] = [];
  visible = false;
  @Ref("thumbnails")
  thumbnails!: HTMLDivElement;
  @Ref("thumbsWrapper")
  thumbsWrapper!: HTMLDivElement;
  @Ref()
  testCanvas!: HTMLCanvasElement;
  thumbnailsWidth = 0;
  areaMaxY = 0;
  areaMinY = 0;
  areaPreVisibleMaxY = 0;
  areaPreVisibleMinY = 0;
  scrollAreaHeight = 0;
  sortMode = SortMode.ADD_DATE;
  thumbnailsResizer?: ResizeObserver;
  scrollAreaResizer?: ResizeObserver;
  firstSelectedTile: Tile | null = null;
  thumbnailsSize = 0;
  currentScrollTileId = "";
  currentScrollTileOffset = 0;
  keyboards = new Keyboards();
  filteredPetaImages: PetaImage[] = [];
  targetPetaImage: PetaImage | null = null;
  ignoreScrollEvent = false;
  mounted() {
    this.thumbnailsResizer = new ResizeObserver((entries) => {
      this.resizeImages(entries[0]!.contentRect);
    });
    this.scrollAreaResizer = new ResizeObserver((entries) => {
      this.resizeScrollArea(entries[0]!.contentRect);
    });
    this.$defines.BROWSER_THUMBNAIL_MARGIN
    this.thumbnails.addEventListener("scroll", this.updateScrollArea);
    this.thumbnails.addEventListener("wheel", (e) => {
      if (Keyboards.pressedOR("control", "meta")) {
        this.thumbnailsSize -= e.deltaY * this.$settings.zoomSensitivity * 0.001;
        this.thumbnailsSize = Math.floor(this.thumbnailsSize);
        if (this.thumbnailsSize < BROWSER_THUMBNAIL_ZOOM_MIN) {
          this.thumbnailsSize = BROWSER_THUMBNAIL_ZOOM_MIN;
        } else if (this.thumbnailsSize > BROWSER_THUMBNAIL_ZOOM_MAX) {
          this.thumbnailsSize = BROWSER_THUMBNAIL_ZOOM_MAX;
        }
      }
    })
    this.$states.groupingByDate
    this.thumbnailsResizer.observe(this.thumbsWrapper);
    this.scrollAreaResizer.observe(this.thumbnails);

    this.thumbnailsSize = this.$states.browserTileSize;
    this.keyboards.enabled = true;
    this.keyboards.down(["a"], this.keyA);
  }
  unmounted() {
    this.thumbnails.removeEventListener("scroll", this.updateScrollArea);
    this.thumbnailsResizer?.unobserve(this.thumbsWrapper);
    this.scrollAreaResizer?.unobserve(this.thumbnails);
    this.thumbnailsResizer?.disconnect();
    this.scrollAreaResizer?.disconnect();
    this.keyboards.destroy();
  }
  saveScrollPosition() {
    let minDistance = Infinity;
    this.tiles.forEach((t) => {
      if (t.petaImage === undefined) {
        return;
      }
      const offset = this.thumbnails.scrollTop - t.position.y;
      const distance = Math.abs(offset);
      if (distance < minDistance) {
        minDistance = distance;
        this.currentScrollTileOffset = offset;
        this.currentScrollTileId = t.petaImage.id;
      }
    });
  }
  restoreScrollPosition() {
    const current = this.tiles.find((bt) => bt.petaImage?.id === this.currentScrollTileId);
    if (current) {
      this.ignoreScrollEvent = true;
      this.thumbnails.scrollTo(0, current.position.y + this.currentScrollTileOffset);
    }
  }
  updateScrollArea(event?: Event, resize = false) {
    const preVisibleOffset = this.scrollAreaHeight * 1;
    const visibleOffset = this.scrollAreaHeight * 0.2;
    this.areaMinY = this.thumbnails.scrollTop - visibleOffset;
    this.areaMaxY = this.scrollAreaHeight + this.thumbnails.scrollTop + visibleOffset;
    this.areaPreVisibleMinY = this.thumbnails.scrollTop - preVisibleOffset;
    this.areaPreVisibleMaxY = this.scrollAreaHeight + this.thumbnails.scrollTop + preVisibleOffset;
    if (resize) {
      return;
    }
    if (this.ignoreScrollEvent) {
      this.ignoreScrollEvent = false;
      return;
    }
    if (this.scrollAreaHeight && event) {
      this.saveScrollPosition();
    }
  }
  resizeScrollArea(rect: DOMRectReadOnly) {
    const areaHeight = rect.height;
    this.scrollAreaHeight = areaHeight;
    this.restoreScrollPosition();
    this.updateScrollArea(undefined, true);
  }
  resizeImages(rect: DOMRectReadOnly) {
    this.thumbnailsWidth = rect.width - BROWSER_THUMBNAIL_MARGIN;
  }
  drag(petaImage: PetaImage) {
    if (!Keyboards.pressedOR("shift", "control", "meta") && !petaImage._selected) {
      this.clearSelectionAllImages();
    }
    const petaImages = petaImage._selected ? [] : [petaImage];
    petaImages.push(...this.selectedPetaImages);
    API.send("startDrag", petaImages, this.actualTileSize, "");
    this.close();
  }
  selectTile(thumb: Tile, force = false) {
    if (thumb.petaImage === undefined) {
      return;
    }
    if (this.selectedPetaImages.length < 1 || (!Keyboards.pressedOR("control", "meta", "shift"))) {
      // 最初の選択、又は修飾キーなしの場合、最初の選択を保存する
      this.firstSelectedTile = thumb;
    }
    if (Keyboards.pressedOR("control", "meta")) {
      // 選択サムネイルを反転
      thumb.petaImage._selected = !thumb.petaImage._selected || force;
    } else {
      // コントロールキーが押されていなければ選択をリセット
      thumb.petaImage._selected = true;
      this.petaImagesArray.forEach((pi) => {
        pi._selected = thumb.petaImage === pi;
      });
    }
    if (this.firstSelectedTile && Keyboards.pressed("shift")) {
      // 最初の選択と、シフトキーが押されていれば、範囲選択。
      const topLeft = new Vec2(
        Math.min(this.firstSelectedTile.position.x, thumb.position.x),
        Math.min(this.firstSelectedTile.position.y, thumb.position.y)
      );
      const size = new Vec2(
        Math.max(this.firstSelectedTile.position.x + this.firstSelectedTile.width, thumb.position.x + thumb.width),
        Math.max( this.firstSelectedTile.position.y + this.firstSelectedTile.height, thumb.position.y + thumb.height)
      ).clone().sub(topLeft);
      this.tiles.forEach((pt) => {
        if (pt.petaImage === undefined) {
          return;
        }
        let widthDiff = pt.width / 2 + size.x / 2 - Math.abs((pt.position.x + pt.width / 2) - (topLeft.x + size.x / 2));
        let heightDiff = pt.height / 2 + size.y / 2 - Math.abs((pt.position.y + pt.height / 2) - (topLeft.y + size.y / 2));
        if (widthDiff > pt.width) {
          widthDiff = pt.width;
        }
        if (heightDiff > pt.height) {
          heightDiff = pt.height;
        }
        const hitArea = widthDiff * heightDiff;
        const ptArea = pt.width * pt.height;
        if (widthDiff > 0 && heightDiff > 0 && hitArea / ptArea >  THUMBNAILS_SELECTION_PERCENT) {
          pt.petaImage._selected = true;
        }
      });
    }
  }
  clearSelectionAllImages() {
    this.petaImagesArray.forEach((pi) => {
      pi._selected = false;
    });
  }
  petaImageMenu(thumb: Tile, position: Vec2) {
    if (thumb.petaImage === undefined) {
      return;
    }
    const petaImage = thumb.petaImage;
    if (!thumb.petaImage._selected) {
      this.selectTile(thumb, true);
    }
    
    this.$components.contextMenu.open([
      {
        label: this.$t("browser.petaImageMenu.remove", [this.selectedPetaImages.length]),
        click: async () => {
          if (await this.$components.dialog.show(this.$t("browser.removeImageDialog", [this.selectedPetaImages.length]), [this.$t("shared.yes"), this.$t("shared.no")]) === 0) {
            await updatePetaImages(this.selectedPetaImages, UpdateMode.REMOVE);
          }
        }
      },
      {
        label: this.$t("browser.petaImageMenu.openImageFile"),
        click: async () => {
          await API.send("openImageFile", petaImage);
        }
      },
      // {
      //   label: this.$t("browser.petaImageMenu.similar"),
      //   click: async () => {
      //     this.targetPetaImage = thumb.petaImage;
      //   }
      // },
      {
        label: this.$t("browser.petaImageMenu.waifu2x"),
        click: async () => {
          await API.send("waifu2xConvert", this.selectedPetaImages);
        }
      },
      {
        label: this.$t("browser.petaImageMenu.searchImageByGoogle"),
        click: async () => {
          await API.send("searchImageByGoogle", petaImage);
        }
      },
    ], position);
  }
  async openDetail(petaImage: PetaImage) {
    if (Keyboards.pressedOR("control", "meta", "shift")) {
      return;
    }
    await API.send("setDetailsPetaImage", petaImage);
    await API.send("openWindow", WindowType.DETAILS);
  }
  open() {
    this.visible = false;
    this.$nextTick(() => {
      this.visible = true;
    });
  }
  close() {
    this.visible = false;
  }
  updateTileSize(value: number) {
    this.$states.browserTileSize = value;
  }
  sort(a: PetaImage, b: PetaImage) {
    switch(this.sortMode) {
      case SortMode.ADD_DATE: {
        if (a.addDate === b.addDate) {
          return b.fileDate - a.fileDate;
        }
        return b.addDate - a.addDate;
      }
    }
  }
  selectTag(tag: PetaTag) {
    this.selectedPetaTags.length = 0;
    this.selectedPetaTags.push(tag);
  }
  @Watch("selectedPetaTags", { deep: true })
  changeSelectedTags() {
    this.currentScrollTileId = "";
    this.$nextTick(() => {
      this.thumbnails.scrollTop = 0;
    });
    this.fetchFilteredPetaImages();
  }
  @Watch("petaImagesArray")
  changePetaImagesArray() {
    this.fetchFilteredPetaImages();
  }
  @Watch("petaTagInfos")
  changePetaTagInfos() {
    this.fetchFilteredPetaImages();
  }
  @Watch("thumbnailsSize")
  changeTilesSize() {
    this.restoreScrollPosition();
  }
  get petaImagesArray() {
    return Object.values(this.petaImages);
  }
  get selectedPetaImages() {
    return this.petaImagesArray.filter((pi) => pi._selected);
  }
  async fetchFilteredPetaImages() {
    if (this.selectedPetaTags.length === 0) {
      this.filteredPetaImages = [...this.petaImagesArray].sort(this.sort);
      return;
    }
    const untagged = this.selectedPetaTags.find((petaTag) => petaTag.id === UNTAGGED_ID)
    const results = await API.send(
      "getPetaImageIdsByPetaTagIds",
      untagged ? [] : this.selectedPetaTags.map((petaTag) => petaTag.id)
    );
    this.filteredPetaImages = Array.from(new Set(results.map((id) => {
      return this.petaImages[id]!;
    }).filter((petaImage) => {
      return petaImage;
    }))).sort(this.sort);
  }
  get thumbnailsRowCount() {
    let c = Math.floor(this.thumbnailsWidth / this.thumbnailsSize);
    if (c < 1) {
      return 1;
    }
    return c;
  }
  get actualTileSize() {
    return this.thumbnailsWidth / this.thumbnailsRowCount;
  }
  get scrollHeight() {
    return this.tiles.map((tile) => {
      return tile.position.y + tile.height
    }).reduce((a, b) => {
      return a > b ? a : b;
    }, 0);
  }
  get tiles(): Tile[] {
    if (this.actualTileSize === 0) {
      return [];
    }
    const yList: number[] = [];
    for (let i = 0; i < this.thumbnailsRowCount; i++) {
      yList.push(0);
    }
    let prevDateString = "";
    const tiles: Tile[] = [];
    this.filteredPetaImages
    // .map((pi) => {
    //   if (!this.targetPetaImage) {
    //     return {
    //       petaImage: pi,
    //       score: 0
    //     }
    //   }
    //   return {
    //     petaImage: pi,
    //     score: getSimilarityScore2(this.targetPetaImage.palette, pi.palette)
    //   }
    // })
    // .sort((a, b) => b.score - a.score)
    // .map((p) => p.petaImage)
    .map((p) => {
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
      const currentDateString = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
      if (prevDateString != currentDateString && this.$states.groupingByDate) {
        prevDateString = currentDateString;
        mvi = 0;
        minY = maxY;
        yList.fill(minY);
        newGroup = true;
      }
      if (newGroup) {
        const height = 32;
        const position = new Vec2(0, yList[mvi]);
        yList.fill(minY + height);
        const tile: Tile = {
          position: position,
          width: this.thumbnailsWidth,
          height: height,
          visible: false,
          preVisible: false,
          group: currentDateString,
          id: currentDateString
        };
        this.updateVisibility(tile);
        tiles.push(tile)
      }
      const position = new Vec2(mvi * this.actualTileSize + BROWSER_THUMBNAIL_MARGIN, yList[mvi]);
      const height = p.height * this.actualTileSize;
      yList[mvi] += height;
      const tile: Tile = {
        petaImage: p,
        position: position,
        width: this.actualTileSize - BROWSER_THUMBNAIL_MARGIN,
        height: height - BROWSER_THUMBNAIL_MARGIN,
        visible: false,
        preVisible: false,
        id: p.id
      }
      this.updateVisibility(tile);
      tiles.push(tile);
    });
    return tiles;
  }
  updateVisibility(tile: Tile) {
    tile.visible = (this.areaMinY < tile.position.y && tile.position.y < this.areaMaxY)
      ||(this.areaMinY < tile.position.y + tile.height && tile.position.y + tile.height < this.areaMaxY)
      ||(this.areaMinY > tile.position.y && tile.position.y + tile.height > this.areaMaxY);
    tile.preVisible = (this.areaPreVisibleMinY < tile.position.y && tile.position.y < this.areaPreVisibleMaxY)
      ||(this.areaPreVisibleMinY < tile.position.y + tile.height && tile.position.y + tile.height < this.areaPreVisibleMaxY)
      ||(this.areaPreVisibleMinY > tile.position.y && tile.position.y + tile.height > this.areaPreVisibleMaxY);
  }
  get visibleTiles(): Tile[] {
    return this.tiles.filter((p) => p.preVisible);
  }
  get original() {
    return this.$settings.loadTilesInOriginal && this.actualTileSize > BROWSER_THUMBNAIL_SIZE;
  }
  keyA() {
    if (isKeyboardLocked()) {
      return;
    }
    if (Keyboards.pressedOR("control", "meta")) {
      this.clearSelectionAllImages();
      this.filteredPetaImages.forEach((pi) => {
        pi._selected = true;
      });
    }
  }
}
</script>

<style lang="scss" scoped>
t-browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  // flex-direction: column;
  // color: #333333;
  // display: flex;
  // flex: 1;
  overflow: hidden;
  >t-left {
    padding: 8px;
    width: 200px;
    min-width: 180px;
    display: block;
  }
  >t-center {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 8px;
    >t-content {
      width: 100%;
      height: 100%;
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      >t-top {
        width: 100%;
        display: flex;
        padding: 0px 0px 8px 0px;
        >t-search {
          display: block;
          flex: 1;
          padding: 0px 8px;
        }
        >t-buttons {
          display: flex;
          align-items: center;
          >label {
            display: flex;
            align-items: center;
          }
        }
      }
      >t-tiles {
        width: 100%;
        position: relative;
        overflow-y: scroll;
        overflow-x: hidden;
        display: block;
        border-radius: 8px;
        >t-tiles-content {
          display: block;
        }
      }
    }
  }
  >t-right {
    width: 200px;
    min-width: 180px;
    padding: 8px;
    display: flex;
    flex-direction: column;
  }
  >t-canvas-test {
    position: fixed;
    bottom: 100px;
    left: 100px;
    background-color: #ff0000;
  }
}
</style>