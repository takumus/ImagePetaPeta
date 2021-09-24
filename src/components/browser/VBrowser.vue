<template>
  <VModal
    :visible="visible"
    :parentStyle="{
      padding: '100px'
    }"
    :childStyle="{
      width: '100%',
      height: '100%'
    }"
    :zIndex="3"
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
                :label="`All(${petaImagesArray.length})`"
                :growWidth="true"
                :readonly="true"
              />
            </li>
            <li
              v-for="c in tags"
              :key="c.name"
              :class="{ selected: c.selected }"
              @click="selectTag(c.name)"
            >
              <VEditableLabel
                :label="c.name"
                :labelLook="`${c.name}(${c.count})`"
                :growWidth="true"
                :readonly="c.readonly"
                @change="(name) => changeTag(c.name, name)"
                @contextmenu="tagMenu($event, c.name)"
              />
            </li>
          </ul>
        </section>
        <section class="images-wrapper">
          <section
            class="images"
            ref="images"
          >
            <div
              class="thumbs-wrapper"
              ref="thumbsWrapper"
              :style="{height: scrollHeight + 8 + 'px'}"
            >
              <VThumbnail
                v-for="(data) in petaThumbnails"
                :key="data.petaImage.id"
                :petaThumbnail="data"
                @add="addPanel"
                @select="selectImage"
                @menu="petaImageMenu"
              />
            </div>
          </section>
        </section>
        <section class="property">
          <VProperty
            :petaImages="selectedPetaImages"
            :allTags="tagsForComplement"
            @changeTag="changePetaImageTag"
          />
        </section>
      </section>
      <section class="bottom">
        <button @click="close">Close</button>
      </section>
    </article>
  </VModal>
</template>

<style lang="scss" scoped>
.browser-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  .bottom {
    text-align: center;
  }
  .top {
    display: flex;
    flex: 1;
    overflow: hidden;
    &.tags {
      padding: 8px;
      text-align: center;
      white-space: nowrap;
      header {
        .search {
          border-radius: 8px;
          border: solid 1.2px #333333;
          outline: none;
          padding: 4px;
          font-weight: bold;
          font-size: 1.0em;
        }
      }
      ul {
        text-align: left;
        // padding: 0px;
        padding-left: 0px;
        width: 100%;
        li {
          width: 100%;
          padding: 4px;
          list-style-type: none;
          font-weight: bold;
          cursor: pointer;
          color: #333333;
          &:hover * {
            text-decoration: underline;
          }
          &::before {
            content: "・";
            width: 16px;
            display: inline-block;
          }
          &.selected::before {
            content: "✔";
          }
        }
      }
    }
    .images {
      width: 100%;
      height: 100%;
      position: relative;
      overflow-y: scroll;
      overflow-x: hidden;
      .thumbs-wrapper {
        width: 100%;
      }
      &::-webkit-scrollbar {
        width: 16px;
      }
      &::-webkit-scrollbar-thumb {
        background-color: #cccccc;
        border-radius: 8px;
      }
    }
    .images-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 8px;
    }
    .property {
      width: 20%;
      min-width: 180px;
      color: #333333;
      padding: 8px;
    }
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/components/VModal.vue";
import VThumbnail from "@/components/browser/VThumbnail.vue";
import VProperty from "@/components/browser/VProperty.vue";
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
// Others
import { createPetaPanel, PetaImage, PetaImages, PetaThumbnail, SortMode, UpdateMode } from "@/datas";
import { Vec2, vec2FromMouseEvent } from "@/utils";
import { API, log } from "@/api";
import GLOBALS from "@/globals";
import { UNTAGGED_TAG_NAME } from "@/defines";
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
  visible = false;
  @Ref("images")
  images!: HTMLDivElement;
  @Ref("thumbsWrapper")
  thumbsWrapper!: HTMLDivElement;
  selectedTags = "";
  selectedData!: PetaImage;
  imagesWidth = 0;
  defaultImageWidth = 128;
  imageWidth = 0;
  areaMaxY = 0;
  areaMinY = 0;
  scrollHeight = 0;
  scrollAreaHeight = 0;
  updateRectIntervalId = 0;
  sortMode = SortMode.ADD_DATE;
  imagesResizer?: ResizeObserver;
  scrollAreaResizer?: ResizeObserver;
  shiftKeyPressed = false;
  mounted() {
    this.imagesResizer = new ResizeObserver((entries) => {
      this.resizeImages(entries[0].contentRect);
    });
    this.scrollAreaResizer = new ResizeObserver((entries) => {
      this.resizeScrollArea(entries[0].contentRect);
    });
    this.images.addEventListener("scroll", this.updateScrollArea);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    this.imagesResizer.observe(this.thumbsWrapper);
    this.scrollAreaResizer.observe(this.images);

    GLOBALS.browser.open = this.open;
    GLOBALS.browser.close = this.close;
  }
  unmounted() {
    this.images.removeEventListener("scroll", this.updateScrollArea);
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    this.imagesResizer?.unobserve(this.thumbsWrapper);
    this.scrollAreaResizer?.unobserve(this.images);
    this.imagesResizer?.disconnect();
    this.scrollAreaResizer?.disconnect();
  }
  keydown(e: KeyboardEvent) {
    switch(e.key.toLowerCase()) {
      case "shift":{
        this.shiftKeyPressed = true;
        break;
      }
      case "a": {
        if (e.ctrlKey || e.metaKey) {
          this.filteredPetaImages.forEach((pi) => {
            pi._selected = true;
          });
        }
        break;
      }
    }
  }
  keyup(e: KeyboardEvent) {
    switch(e.key) {
      case "Shift":
        this.shiftKeyPressed = false;
        break;
    }
  }
  updateScrollArea() {
    const offset = this.scrollAreaHeight;
    this.areaMinY = this.images.scrollTop - offset;
    this.areaMaxY = this.scrollAreaHeight + this.images.scrollTop + offset;
  }
  resizeScrollArea(rect: DOMRectReadOnly) {
    const areaHeight = rect.height;
    this.scrollAreaHeight = areaHeight;
    this.updateScrollArea();
  }
  resizeImages(rect: DOMRectReadOnly) {
    this.imagesWidth = rect.width;
  }
  selectTag(tag: string) {
    const tags = [...this.selectedTagsArray];
    const index = tags.indexOf(tag);
    if (index < 0) {
      if (!this.shiftKeyPressed) {
        tags.length = 0;
      }
      tags.push(tag);
      this.selectedTags = tags.join(" ");
    } else {
      if (!this.shiftKeyPressed) {
        tags.length = 0;
        tags.push(tag);
      } else {
        tags.splice(index, 1);
      }
      this.selectedTags = tags.join(" ");
    }
  }
  addPanel(petaImage: PetaImage, worldPosition: Vec2, thumbnailPosition: Vec2) {
    petaImage._selected = false;
    // 複数同時追加用↓
    // const images = [petaImage, ...this.selectedPetaImages].reverse();
    const images = [petaImage];
    petaImage._selected = true;
    images.forEach((pi, i) => {
      const panel = createPetaPanel(pi, thumbnailPosition.clone(), this.imageWidth);
      this.$emit("addPanel", panel, worldPosition.clone().add(new Vec2(40, 0).mult(-(images.length - 1) + i)));
      pi._selected = false;
    });
    this.selectedPetaImages.forEach((pi) => {
      pi._selected = false;
    });
    this.close();
  }
  selectImage(petaImage: PetaImage) {
    petaImage._selected = !petaImage._selected;
  }
  complementTag(event: FocusEvent) {
    GLOBALS.complement.open(event.target as HTMLInputElement, this.tags.map((c) => c.name));
  }
  tagMenu(event: MouseEvent, tag: string) {
    GLOBALS.contextMenu.open([
      {
        label: `Remove "${tag}"`,
        click: () => {
          this.changeTag(tag, "");
        }
      }
    ], vec2FromMouseEvent(event));
  }
  async changeTag(oldName: string, newName: string) {
    newName = newName.replace(/\s+/g, "");
    if (oldName == newName) {
      return;
    }
    let remove = false;
    if (newName == "") {
      remove = await API.send("dialog", `Remove "${oldName}"?`, ["Yes", "No"]) == 0;
      if (!remove) {
        return;
      }
    }
    if (this.tags.find((c) => c.name == newName)) {
      API.send("dialog", `"${newName}" already exists.`, []);
      return;
    }
    const changed: PetaImage[] = [];
    this.petaImagesArray.forEach((pi) => {
      const index = pi.tags.indexOf(oldName);
      if (index >= 0) {
        if (remove) {
          pi.tags.splice(index, 1);
        } else {
          pi.tags[index] = newName;
        }
        changed.push(pi);
      }
    });
    API.send("updatePetaImages", changed, UpdateMode.UPDATE);
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
    })
  }
  petaImageMenu(petaImage: PetaImage, position: Vec2) {
    petaImage._selected = true;
    GLOBALS.contextMenu.open([
      {
        label: `Remove ${this.selectedPetaImages.length} Images`,
        click: async () => {
          if (await API.send("dialog", `Remove ${this.selectedPetaImages.length} Images?`, ["Yes", "No"]) == 0) {
            API.send("updatePetaImages", this.selectedPetaImages, UpdateMode.REMOVE);
          }
        }
      }
    ], position);
  }
  open() {
    this.visible = true;
    console.log(1);
  }
  close() {
    this.visible = false;
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
    return this.petaImagesArray.filter((d) => {
      return d.tags.length == 0;
    });
  }
  get filteredPetaImages() {
    if (this.selectedTagsArray.indexOf(UNTAGGED_TAG_NAME) >= 0) {
      return this.uncategorizedImages;
    }
    return this.petaImagesArray.filter((d) => {
      let result = true;
      this.selectedTagsArray.forEach((k) => {
        if (!d.tags.includes(k)) {
          result = false;
        }
      });
      return result;
    });
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
  get tags():Tag[] {
    const tags: Tag[] = [];
    this.petaImagesArray.forEach((pi) => {
      pi.tags.forEach((tag) => {
        const c = tags.find((c) => tag == c.name);
        if (!c) {
          tags.push({
            name: tag,
            count: 1,
            selected: this.selectedTagsArray.indexOf(tag) >= 0,
            readonly: false
          });
        } else {
          c.count++;
        }
      });
    });
    tags.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else {
        return 1;
      }
    });
    return [{
      name: UNTAGGED_TAG_NAME,
      count: this.uncategorizedImages.length,
      selected: this.selectedTagsArray.indexOf(UNTAGGED_TAG_NAME) >= 0,
      readonly: true
    }, ...tags];
  }
  get tagsForComplement() {
    return this.tags.filter((c) => c.name != UNTAGGED_TAG_NAME).map(c => c.name);
  }
  get selectedAll() {
    return this.selectedTagsArray.length == 0;
  }
  get petaThumbnails(): PetaThumbnail[] {
    const hc = Math.floor(this.imagesWidth / this.defaultImageWidth);
    this.imageWidth = this.imagesWidth / hc;
    const yList: number[] = [];
    this.scrollHeight = 0;
    for (let i = 0; i < hc; i++) {
      yList.push(0);
    }
    return this.filteredPetaImages.map((p) => {
      let minY = Number.MAX_VALUE;
      let mvi = 0;
      yList.forEach((y, vi) => {
        if (minY > y) {
          minY = y;
          mvi = vi;
        }
      });
      const position = new Vec2(mvi * this.imageWidth, yList[mvi]);
      const height = p.height * this.imageWidth;
      yList[mvi] += height;
      if (this.scrollHeight < yList[mvi]) {
        this.scrollHeight = yList[mvi];
      }
      return {
        petaImage: p,
        position: position,
        width: this.imageWidth,
        height: height,
        visible: (this.areaMinY < position.y && position.y < this.areaMaxY) || (this.areaMinY < position.y + height && position.y + height < this.areaMaxY)
      }
    }).filter((p) => p.visible);
  }
}
interface Tag {
  name: string,
  count: number,
  selected: boolean,
  readonly: boolean
}
</script>