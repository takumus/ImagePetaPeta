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
          <header>
            <input
              class="search"
              type="text"
              v-model="selectedTags"
              @focus="complementTag($event)"
            >
          </header>
          <ul>
            <li
              @click="selectTag('')"
              :class="{ selected: selectedAll }"
            >
              <VEditableLabel
                :label="`${$t('browser.all')}(${petaImagesArray.length})`"
                :growWidth="true"
                :readonly="true"
              />
            </li>
            <li
              v-for="c in tags"
              :key="c.petaTag.id"
              :class="{ selected: c.selected }"
              @click="selectTag(c.petaTag.name)"
            >
              <VEditableLabel
                :label="c.petaTag.name"
                :labelLook="`${c.petaTag.name}(${c.count})`"
                :growWidth="true"
                :readonly="c.readonly"
                @change="(name) => changeTag(c.petaTag, name)"
                @contextmenu="tagMenu($event, c.petaTag)"
              />
            </li>
          </ul>
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
              <VThumbnail
                v-for="(data) in visibleBrowserThumbnails"
                :key="data.petaImage.id"
                :browserThumbnail="data"
                :fullsized="fullsized"
                :petaTags="petaTags"
                @add="addPanel"
                @select="selectThumbnail"
                @menu="petaImageMenu"
              />
            </div>
          </section>
        </section>
        <section class="property">
          <VProperty
            :petaImages="selectedPetaImages"
            :allPetaTags="petaTags"
            @changeTag="changePetaImageTag"
          />
          <input
            type="range"
            v-model="thumbnailsSize"
            tabindex="-1"
            @change="$settings.browserThumbnailSize = Number($event.target.value)"
            :min="$defines.BROWSER_THUMBNAIL_ZOOM_MIN"
            :max="$defines.BROWSER_THUMBNAIL_ZOOM_MAX"
            :step="$defines.BROWSER_THUMBNAIL_ZOOM_STEP"
          >
        </section>
      </section>
      <!-- <section class="bottom">
        <button @click="close">{{$t("shared.closeButton")}}</button>
      </section> -->
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VThumbnail from "@/rendererProcess/components/browser/VThumbnail.vue";
import VProperty from "@/rendererProcess/components/browser/VProperty.vue";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { API, log } from "@/rendererProcess/api";
import { BOARD_MAX_PETAPANEL_ADD_COUNT, THUMBNAILS_SELECTION_PERCENT, UNTAGGED_TAG_NAME } from "@/commons/defines";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { SortMode } from "@/commons/datas/sortMode";
import { BrowserThumbnail } from "@/rendererProcess/components/browser/browserThumbnail";
import { createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaTag } from "@/commons/datas/petaTag";
import { getPetaTagsOfPetaImage } from "@/rendererProcess/utils/getPetaTagsOfPetaImage";
@Options({
  components: {
    VThumbnail,
    VProperty,
    VEditableLabel,
    VModal
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
  petaTags: PetaTag[] = [];
  visible = false;
  @Ref("thumbnails")
  thumbnails!: HTMLDivElement;
  @Ref("thumbsWrapper")
  thumbsWrapper!: HTMLDivElement;
  selectedTags = "";
  thumbnailsWidth = 0;
  thumbnailWidth = 0;
  areaMaxY = 0;
  areaMinY = 0;
  scrollHeight = 0;
  scrollAreaHeight = 0;
  sortMode = SortMode.ADD_DATE;
  thumbnailsResizer?: ResizeObserver;
  scrollAreaResizer?: ResizeObserver;
  firstSelectedBrowserThumbnail: BrowserThumbnail | null = null;
  thumbnailsSize = 0;
  currentScrollThumbnailId = "";
  keyboards = new Keyboards();
  mounted() {
    this.thumbnailsResizer = new ResizeObserver((entries) => {
      this.resizeImages(entries[0].contentRect);
    });
    this.scrollAreaResizer = new ResizeObserver((entries) => {
      this.resizeScrollArea(entries[0].contentRect);
    });
    this.thumbnails.addEventListener("scroll", this.updateScrollArea);
    this.thumbnailsResizer.observe(this.thumbsWrapper);
    this.scrollAreaResizer.observe(this.thumbnails);

    this.$components.browser = this;
    this.thumbnailsSize = this.$settings.browserThumbnailSize;
    this.keyboards.enabled = true;
    this.keyboards.on("a", this.keyA);
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
    this.browserThumbnails.forEach((t) => {
      const d = Math.abs(t.position.y - this.thumbnails.scrollTop);
      if (d < min) {
        min = d;
        this.currentScrollThumbnailId = t.petaImage.id;
      }
    });
  }
  restoreScrollPosition() {
    const current = this.browserThumbnails.find((bt) => bt.petaImage.id == this.currentScrollThumbnailId);
    if (current) {
      this.thumbnails.scrollTo(0, current.position.y);
    }
  }
  updateScrollArea(event?: Event) {
    const offset = this.scrollAreaHeight * 0.1;
    this.areaMinY = this.thumbnails.scrollTop - offset;
    this.areaMaxY = this.scrollAreaHeight + this.thumbnails.scrollTop + offset;
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
  selectTag(tag: string) {
    const tags = [...this.selectedTagsArray];
    const index = tags.indexOf(tag);
    if (index < 0) {
      if (!this.keyboards.isPressed("shift")) {
        tags.length = 0;
      }
      tags.push(tag);
      this.selectedTags = tags.join(" ");
    } else {
      if (!this.keyboards.isPressed("shift")) {
        tags.length = 0;
        tags.push(tag);
      } else {
        tags.splice(index, 1);
      }
      this.selectedTags = tags.join(" ");
    }
  }
  async addPanel(thumb: BrowserThumbnail, worldPosition: Vec2, thumbnailPosition: Vec2) {
    if (!this.keyboards.isPressed("shift") && !this.keyboards.isPressed("control") && !this.keyboards.isPressed("meta") && !thumb.petaImage._selected) {
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
        this.thumbnailWidth
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
  selectThumbnail(thumb: BrowserThumbnail, force = false) {
    if (this.selectedPetaImages.length < 1 || (!this.keyboards.isPressed("control") && !this.keyboards.isPressed("meta") && !this.keyboards.isPressed("shift"))) {
      // 最初の選択、又は修飾キーなしの場合、最初の選択を保存する
      this.firstSelectedBrowserThumbnail = thumb;
    }
    // 全選択解除するが、選択サムネイルは状態を保持する。
    const prevSelection = thumb.petaImage._selected;
    if (!this.keyboards.isPressed("control") && !this.keyboards.isPressed("meta")) {
      // コントロールキーが押されていなければ選択をリセット
      this.clearSelectionAllImages();
    }
    thumb.petaImage._selected = prevSelection;
    // 選択サムネイルを反転
    thumb.petaImage._selected = !thumb.petaImage._selected || force;
    if (this.firstSelectedBrowserThumbnail && this.keyboards.isPressed("shift")) {
      // 最初の選択と、シフトキーが押されていれば、範囲選択。
      const topLeft = new Vec2(
        Math.min(this.firstSelectedBrowserThumbnail.position.x, thumb.position.x),
        Math.min(this.firstSelectedBrowserThumbnail.position.y, thumb.position.y)
      );
      const size = new Vec2(
        Math.max(this.firstSelectedBrowserThumbnail.position.x + this.firstSelectedBrowserThumbnail.width, thumb.position.x + thumb.width),
        Math.max( this.firstSelectedBrowserThumbnail.position.y + this.firstSelectedBrowserThumbnail.height, thumb.position.y + thumb.height)
      ).clone().sub(topLeft);
      this.browserThumbnails.forEach((pt) => {
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
  complementTag(event: FocusEvent) {
    this.$components.complement.open(event.target as HTMLInputElement, this.tags.map((c) => c.petaTag.name));
  }
  tagMenu(event: MouseEvent, tag: PetaTag) {
    this.$components.contextMenu.open([
      {
        label: this.$t("browser.tagMenu.remove", [tag.name]),
        click: () => {
          this.removeTag(tag);
        }
      }
    ], vec2FromMouseEvent(event));
  }
  async removeTag(petaTag: PetaTag) {
    if (await this.$components.dialog.show(this.$t("browser.removeTagDialog", [petaTag.name]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
      await API.send("updatePetaTags", [petaTag], UpdateMode.REMOVE);
    }
  }
  async changeTag(petaTag: PetaTag, newName: string) {
    newName = newName.replace(/\s+/g, "");
    if (petaTag.name == newName) {
      return;
    }
    if (this.tags.find((c) => c.petaTag.name == newName)) {
      this.$components.dialog.show(this.$t("browser.tagAlreadyExistsDialog", [newName]), [this.$t("shared.yes")]);
      return;
    }
    petaTag.name = newName;
    await API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
    this.selectTag(newName);
  }
  changePetaImageTag(oldName: string, newName: string) {
    if (oldName == newName) return;
    const tags = [...this.selectedTagsArray];
    const index = tags.indexOf(oldName);
    if (index < 0) {
      return;
    }
    tags[index] = newName;
    this.selectedTags = tags.join(" ");
  }
  clearSelectionAllImages() {
    this.petaImagesArray.forEach((pi) => {
      pi._selected = false;
    });
  }
  petaImageMenu(thumb: BrowserThumbnail, position: Vec2) {
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
  @Watch("selectedTags")
  changeSelectedTags() {
    this.thumbnails.scrollTo(0, 0);
    this.currentScrollThumbnailId = "";
  }
  @Watch("thumbnailsSize")
  changeThumbnailsSize() {
    this.restoreScrollPosition();
  }
  get selectedTagsArray() {
    return this.selectedTags.split(" ").filter((tag) => tag != "");
  }
  get petaImagesArray() {
    return Object.values(this.petaImages).sort(this.sort);
  }
  get selectedPetaImages() {
    return this.petaImagesArray.filter((pi) => pi._selected);
  }
  get uncategorizedImages() {
    return this.petaImagesArray.filter((petaImage) => {
      return getPetaTagsOfPetaImage(petaImage, this.petaTags).length == 0;
    });
  }
  get filteredPetaImages() {
    if (this.selectedTagsArray.indexOf(UNTAGGED_TAG_NAME) >= 0) {
      return this.uncategorizedImages;
    }
    return this.petaImagesArray.filter((d) => {
      let result = true;
      this.selectedTagsArray.forEach((k) => {
        const petaTag = this.petaTags.find((petaTag) => petaTag.name == k);
        if (petaTag && petaTag.petaImages.indexOf(d.id) < 0) {
          result = false;
        }
      });
      return result;
    });
  }
  get tags(): Tag[] {
    const tags: Tag[] = [];
    this.petaTags.forEach((petaTag) => {
      tags.push({
        petaTag: petaTag,
        count: petaTag.petaImages.length,
        selected: this.selectedTagsArray.indexOf(petaTag.name) >= 0,
        readonly: false
      });
    })
    tags.sort((a, b) => {
      if (a.petaTag.name < b.petaTag.name) {
        return -1;
      } else {
        return 1;
      }
    });
    return [{
      petaTag: {
        id: "untagged",
        name:UNTAGGED_TAG_NAME,
        index: 0,
        petaImages: []
      },
      count: this.uncategorizedImages.length,
      selected: this.selectedTagsArray.indexOf(UNTAGGED_TAG_NAME) >= 0,
      readonly: true
    }, ...tags];
  }
  get tagsForComplement() {
    return this.tags.filter((c) => c.petaTag.name != UNTAGGED_TAG_NAME).map(c => c.petaTag.name);
  }
  get selectedAll() {
    return this.selectedTagsArray.length == 0;
  }
  get browserThumbnails(): BrowserThumbnail[] {
    let hc = Math.floor(this.thumbnailsWidth / this.thumbnailsSize);
    if (hc < 1) {
      hc = 1;
    }
    this.thumbnailWidth = this.thumbnailsWidth / hc;
    if (this.thumbnailWidth == 0) {
      return [];
    }
    const yList: number[] = [];
    this.scrollHeight = 0;
    for (let i = 0; i < hc; i++) {
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
      const position = new Vec2(mvi * this.thumbnailWidth, yList[mvi]);
      const height = p.height * this.thumbnailWidth;
      yList[mvi] += height;
      if (this.scrollHeight < yList[mvi]) {
        this.scrollHeight = yList[mvi];
      }
      return {
        petaImage: p,
        position: position,
        width: this.thumbnailWidth,
        height: height,
        visible: 
          (this.areaMinY < position.y && position.y < this.areaMaxY)
          ||(this.areaMinY < position.y + height && position.y + height < this.areaMaxY)
          ||(this.areaMinY > position.y && position.y + height > this.areaMaxY)
      }
    });
    return images;
  }
  get visibleBrowserThumbnails(): BrowserThumbnail[] {
    return this.browserThumbnails.filter((p) => p.visible);
  }
  get fullsized() {
    return this.$settings.loadThumbnailsInFullsized && this.thumbnailWidth > this.$settings.thumbnails.size;
  }
  keyA(value: boolean) {
    if (value) {
      if (this.keyboards.isPressed("control") || this.keyboards.isPressed("meta")) {
        this.filteredPetaImages.forEach((pi) => {
          pi._selected = true;
        });
      }
    }
  }
}
interface Tag {
  petaTag: PetaTag,
  count: number,
  selected: boolean,
  readonly: boolean
}
</script>

<style lang="scss" scoped>
.browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  // color: #333333;
  >.bottom {
    text-align: center;
  }
  >.top {
    display: flex;
    flex: 1;
    overflow: hidden;
    >.tags {
      flex-direction: column;
      padding: 8px;
      text-align: center;
      white-space: nowrap;
      display: flex;
      width: 20%;
      max-width: 180px;
      >header {
        >.search {
          border-radius: var(--rounded);
          border: solid 1.2px #333333;
          outline: none;
          padding: 4px;
          font-weight: bold;
          font-size: 1.0em;
          width: 100%;
        }
      }
      >ul {
        text-align: left;
        padding-left: 0px;
        width: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
        flex: 1;
        margin: 0px;
        margin-top: 12px;
        >li {
          width: 100%;
          padding: 4px;
          list-style-type: none;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          &:hover * {
            text-decoration: underline;
          }
          &::before {
            content: "・";
            width: 16px;
            display: inline-block;
            flex-shrink: 0;
          }
          &.selected::before {
            content: "✔";
          }
        }
      }
    }
    >.thumbnails-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 8px;
      >.thumbnails {
        width: 100%;
        height: 100%;
        position: relative;
        overflow-y: scroll;
        overflow-x: hidden;
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