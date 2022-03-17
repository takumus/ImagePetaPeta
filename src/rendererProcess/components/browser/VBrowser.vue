<template>
  <VModal
    :visible="visible"
    :parentStyle="{
      padding: '74px'
    }"
    :childStyle="{
      width: '100%',
      height: '100%'
    }"
    :visibleCloseButton="true"
    @state="onModalState"
    @close="close"
  >
    <article class="browser-root">
      <section class="top">
        <section class="tags">
          <VTags
            :petaImagesArray="petaImagesArray"
            :petaTagInfos="petaTagInfos"
            :selectedPetaTags="selectedPetaTags"
          />
        </section>
        <section class="center">
          <section class="header">
            <section class="input">
              <VSearch
                :petaTagInfos="petaTagInfos"
                :selectedPetaTags="selectedPetaTags"
              />
            </section>
          </section>
          <section class="thumbnails-wrapper">
            <section
              class="thumbnails"
              ref="thumbnails"
            >
              <div
                class="thumbs-wrapper"
                ref="thumbsWrapper"
                :style="{height: scrollHeight + 8 + 'px'}"
              >
                <VTile
                  v-for="(data) in visibleTiles"
                  :key="data.petaImage.id"
                  :tile="data"
                  :original="original"
                  :petaTagInfos="petaTagInfos"
                  @add="addPanel"
                  @select="selectThumbnail"
                  @menu="petaImageMenu"
                />
              </div>
            </section>
          </section>
        </section>
        <section class="property">
          <VProperty
            :petaImages="selectedPetaImages"
            :petaTagInfos="petaTagInfos"
            @selectTag="(tag) => selectedPetaTags = [tag]"
          />
          <input
            type="range"
            v-model="thumbnailsSize"
            tabindex="-1"
            @change="$settings.tileSize = Number($event.target.value)"
            :min="$defines.BROWSER_THUMBNAIL_ZOOM_MIN"
            :max="$defines.BROWSER_THUMBNAIL_ZOOM_MAX"
            :step="$defines.BROWSER_THUMBNAIL_ZOOM_STEP"
          >
        </section>
      </section>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VTile from "@/rendererProcess/components/browser/tile/VTile.vue";
import VProperty from "@/rendererProcess/components/browser/property/VProperty.vue";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import VTags from "@/rendererProcess/components/browser/tags/VTags.vue";
import VSearch from "@/rendererProcess/components/browser/search/VSearch.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { API } from "@/rendererProcess/api";
import { BOARD_MAX_PETAPANEL_ADD_COUNT, THUMBNAILS_SELECTION_PERCENT } from "@/commons/defines";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { SortMode } from "@/commons/datas/sortMode";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaTag } from "@/commons/datas/petaTag";
import { isKeyboardLocked } from "@/rendererProcess/utils/isKeyboardLocked";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
@Options({
  components: {
    VTile,
    VProperty,
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
  visible = false;
  @Ref("thumbnails")
  thumbnails!: HTMLDivElement;
  @Ref("thumbsWrapper")
  thumbsWrapper!: HTMLDivElement;
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
  currentScrollThumbnailId = "";
  keyboards = new Keyboards();
  selectedPetaTags: PetaTag[] = [];
  filteredPetaImages: PetaImage[] = [];
  mounted() {
    this.thumbnailsResizer = new ResizeObserver((entries) => {
      this.resizeImages(entries[0]!.contentRect);
    });
    this.scrollAreaResizer = new ResizeObserver((entries) => {
      this.resizeScrollArea(entries[0]!.contentRect);
    });
    this.thumbnails.addEventListener("scroll", this.updateScrollArea);
    this.thumbnailsResizer.observe(this.thumbsWrapper);
    this.scrollAreaResizer.observe(this.thumbnails);

    this.$components.browser = this;
    this.thumbnailsSize = this.$settings.tileSize;
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
    let min = Infinity;
    this.tiles.forEach((t) => {
      const d = Math.abs(t.position.y - this.thumbnails.scrollTop);
      if (d < min) {
        min = d;
        this.currentScrollThumbnailId = t.petaImage.id;
      }
    });
  }
  restoreScrollPosition() {
    const current = this.tiles.find((bt) => bt.petaImage.id == this.currentScrollThumbnailId);
    if (current) {
      this.thumbnails.scrollTo(0, current.position.y);
    }
  }
  updateScrollArea(event?: Event) {
    const preVisibleOffset = this.scrollAreaHeight * 2;
    const visibleOffset = this.scrollAreaHeight * 0.5;
    this.areaMinY = this.thumbnails.scrollTop - visibleOffset;
    this.areaMaxY = this.scrollAreaHeight + this.thumbnails.scrollTop + visibleOffset;
    this.areaPreVisibleMinY = this.thumbnails.scrollTop - preVisibleOffset;
    this.areaPreVisibleMaxY = this.scrollAreaHeight + this.thumbnails.scrollTop + preVisibleOffset;
    if (this.scrollAreaHeight && event) {
      this.saveScrollPosition();
    }
  }
  resizeScrollArea(rect: DOMRectReadOnly) {
    const areaHeight = rect.height;
    this.scrollAreaHeight = areaHeight;
    this.restoreScrollPosition();
    this.updateScrollArea();
  }
  resizeImages(rect: DOMRectReadOnly) {
    this.thumbnailsWidth = rect.width;
  }
  async addPanel(thumb: Tile, worldPosition: Vec2, thumbnailPosition: Vec2) {
    if (!Keyboards.pressedOR("shift", "control", "meta") && !thumb.petaImage._selected) {
      this.clearSelectionAllImages();
    }
    // 複数同時追加
    const thumbnails = thumb.petaImage._selected ? [] : [thumb.petaImage];
    thumbnails.push(...this.selectedPetaImages)
    thumbnails.reverse();
    if (thumbnails.length > BOARD_MAX_PETAPANEL_ADD_COUNT) {
      if (await this.$components.dialog.show(this.$t("boards.addManyImageDialog", [thumbnails.length]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
        return;
      }
    }
    thumb.petaImage._selected = true;
    thumbnails.forEach((pi, i) => {
      const panel = createPetaPanel(
        pi,
        worldPosition.clone(),
        this.actualThumbnailSize
      );
      this.$emit(
        "addPanel",
        panel,
        i
      );
      pi._selected = false;
    });
    this.selectedPetaImages.forEach((pi) => {
      pi._selected = false;
    });
    this.close();
  }
  selectThumbnail(thumb: Tile, force = false) {
    if (this.selectedPetaImages.length < 1 || (!Keyboards.pressedOR("control", "meta", "shift"))) {
      // 最初の選択、又は修飾キーなしの場合、最初の選択を保存する
      this.firstSelectedTile = thumb;
    }
    // 全選択解除するが、選択サムネイルは状態を保持する。
    const prevSelection = thumb.petaImage._selected;
    if (!Keyboards.pressedOR("control", "meta")) {
      // コントロールキーが押されていなければ選択をリセット
      this.clearSelectionAllImages();
    }
    thumb.petaImage._selected = prevSelection;
    // 選択サムネイルを反転
    thumb.petaImage._selected = !thumb.petaImage._selected || force;
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
    if (!thumb.petaImage._selected) {
      this.selectThumbnail(thumb, true);
    }
    this.$components.contextMenu.open([
      {
        label: this.$t("browser.petaImageMenu.remove", [this.selectedPetaImages.length]),
        click: async () => {
          if (await this.$components.dialog.show(this.$t("browser.removeImageDialog", [this.selectedPetaImages.length]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
            await updatePetaImages(this.selectedPetaImages, UpdateMode.REMOVE);
          }
        }
      },
      {
        label: this.$t("browser.petaImageMenu.openImageFile"),
        click: async () => {
          await API.send("openImageFile", thumb.petaImage);
        }
      }
    ], position);
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
  sort(a: PetaImage, b: PetaImage) {
    switch(this.sortMode) {
      case SortMode.ADD_DATE: {
        if (a.addDate == b.addDate) {
          return b.fileDate - a.fileDate;
        }
        return b.addDate - a.addDate;
      }
    }
  }
  onModalState(value: boolean) {
    this.keyboards.enabled = value;
  }
  @Watch("selectedPetaTags", { deep: true })
  changeSelectedTags() {
    this.currentScrollThumbnailId = "";
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
  changeThumbnailsSize() {
    this.restoreScrollPosition();
  }
  get petaImagesArray() {
    return Object.values(this.petaImages).sort(this.sort);
  }
  get selectedPetaImages() {
    return this.petaImagesArray.filter((pi) => pi._selected);
  }
  uncategorizedImages: PetaImage[] = [];
  async fetchFilteredPetaImages() {
    if (this.selectedPetaTags.length == 0) {
      this.filteredPetaImages = this.petaImagesArray;
      return;
    }
    const untagged = this.selectedPetaTags.find((petaTag) => petaTag.id === "untagged")
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
  get actualThumbnailSize() {
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
    if (this.actualThumbnailSize == 0) {
      return [];
    }
    const yList: number[] = [];
    for (let i = 0; i < this.thumbnailsRowCount; i++) {
      yList.push(0);
    }
    const images = this.filteredPetaImages.map((p) => {
      let minY = Number.MAX_VALUE;
      let mvi = 0;
      yList.forEach((y, vi) => {
        if (minY > y) {
          minY = y;
          mvi = vi;
        }
      });
      const position = new Vec2(mvi * this.actualThumbnailSize, yList[mvi]);
      const height = p.height * this.actualThumbnailSize;
      yList[mvi] += height;
      return {
        petaImage: p,
        position: position,
        width: this.actualThumbnailSize,
        height: height,
        petaTags: [],
        visible: 
          (this.areaMinY < position.y && position.y < this.areaMaxY)
          ||(this.areaMinY < position.y + height && position.y + height < this.areaMaxY)
          ||(this.areaMinY > position.y && position.y + height > this.areaMaxY),
        preVisible: 
          (this.areaPreVisibleMinY < position.y && position.y < this.areaPreVisibleMaxY)
          ||(this.areaPreVisibleMinY < position.y + height && position.y + height < this.areaPreVisibleMaxY)
          ||(this.areaPreVisibleMinY > position.y && position.y + height > this.areaPreVisibleMaxY),
      }
    });
    return images;
  }
  get visibleTiles(): Tile[] {
    const tiles = this.tiles.filter((p) => p.preVisible);
    return tiles;
  }
  get original() {
    return this.$settings.loadThumbnailsInOriginal && this.actualThumbnailSize > this.$settings.thumbnails.size;
  }
  keyA() {
    if (isKeyboardLocked()) {
      return;
    }
    if (Keyboards.pressedOR("control", "meta")) {
      this.filteredPetaImages.forEach((pi) => {
        pi._selected = true;
      });
    }
  }
}
</script>

<style lang="scss" scoped>
.browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  // color: #333333;
  >.top {
    display: flex;
    flex: 1;
    overflow: hidden;
    >.tags {
      padding: 8px;
      width: 20%;
      max-width: 180px;
    }
    >.center {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 8px;
      >.header {
        width: 100%;
        padding-bottom: 8px;
        >.input {
          display: block;
          max-width: 512px;
          margin: 0 auto;
        }
      }
      >.thumbnails-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
        flex: 1;
        overflow: hidden;
        >.thumbnails {
          width: 100%;
          height: 100%;
          position: relative;
          overflow-y: scroll;
          overflow-x: hidden;
        }
      }
    }
    >.property {
      width: 20%;
      max-width: 180px;
      padding: 8px;
      display: flex;
      flex-direction: column;
    }
  }
}
</style>