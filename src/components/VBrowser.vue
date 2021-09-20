<template>
  <article class="browser-root">
    <div class="wrapper">
      <section class="bottom">
        <section class="categories">
          <header>
            <input
              type="text"
              v-model="selectedCategories"
            >
          </header>
          <ul>
            <li @click="selectCategory('')">
              <VEditableLabel :label="`All(${petaImagesArray.length})`" :growWidth="true" :readonly="true"/>
            </li>
            <li @click="selectCategory('', true)" v-if="uncategorizedImages.length > 0">
              <VEditableLabel :label="`Uncategorized(${uncategorizedImages.length})`" :growWidth="true" :readonly="true"/>
            </li>
            <li
              v-for="c in _categories"
              :key="c.name"
              @click="selectCategory(c.name)"
            >
              <VEditableLabel :label="c.name" :labelLook="`${c.name}(${c.count})`" @change="(name) => changeCategory(c.name, name)" :growWidth="true" />
            </li>
          </ul>
        </section>
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
              v-for="(data) in _petaThumbnails"
              :key="data.petaImage.id"
              :petaThumbnail="data"
              @add="addPanel"
              @select="selectImage"
              @menu="petaImageMenu"
            />
          </div>
        </section>
        <section class="property">
          <VProperty :petaImages="selectedPetaImages"/>
        </section>
      </section>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.browser-root {
  width: 100%;
  height: 100%;
  .wrapper {
    width: 100%;
    height: 100%;
    background-color: #ffffff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    padding: 16px;
    .bottom {
      width: 100%;
      height: 100%;
      display: flex;
      .categories {
        padding: 8px;
        text-align: center;
        ul {
          text-align: left;
          // padding: 0px;
          padding-left: 8px;
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
      }
      .property {
        width: 20%;
        min-width: 180px;
        color: #333333;
      }
    }
  }
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Categories, Category, createPetaPanel, PetaImage, PetaImages, PetaPanel, PetaThumbnail, SortMode, UpdateMode } from "@/datas";
import { Prop, Ref } from "vue-property-decorator";

import VThumbnail from "@/components/VThumbnail.vue";
import VProperty from "@/components/VProperty.vue";
import VEditableLabel from "@/components/VEditableLabel.vue";
import { Vec2 } from "@/utils";
import { API, log } from "@/api";
import GLOBAL from "@/globals";
@Options({
  components: {
    VThumbnail,
    VProperty,
    VEditableLabel
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
  visible = false;
  @Ref("images")
  images!: HTMLDivElement;
  @Ref("thumbsWrapper")
  thumbsWrapper!: HTMLDivElement;
  selectedCategories = "";
  selectUncategorized = false;
  selectedData!: PetaImage;
  imagesWidth = 0;
  defaultImageWidth = 128;
  imageWidth = 0;
  areaMaxY = 0;
  areaMinY = 0;
  scrollHeight = 0;
  updateRectIntervalId = 0;
  sortMode = SortMode.ADD_DATE;
  mounted() {
    this.updateRectIntervalId = window.setInterval(this.updateRect, 100);
  }
  unmounted() {
    window.clearInterval(this.updateRectIntervalId);
  }
  updateRect() {
    if (!this.visible) return;
    this.imagesWidth = this.thumbsWrapper.getBoundingClientRect().width;
    const areaHeight = this.images.getBoundingClientRect().height;
    const offset = areaHeight;
    this.areaMinY = this.images.scrollTop - offset;
    this.areaMaxY = areaHeight + this.images.scrollTop + offset;
  }
  selectCategory(category: string, uncategorized = false) {
    this.selectedCategories = category;
    this.selectUncategorized = uncategorized;
    // this.clearSelectionAllImages();
  }
  addPanel(petaImage: PetaImage, worldPosition: Vec2, thumbnailPosition: Vec2) {
    petaImage._selected = false;
    const images = [petaImage, ...this.selectedPetaImages].reverse();
    petaImage._selected = true;
    images.forEach((pi, i) => {
      const panel = createPetaPanel(pi, thumbnailPosition.clone(), this.imageWidth);
      this.$emit("addPanel", panel, worldPosition.clone().add(new Vec2(40, 0).mult(-(images.length - 1) + i)));
      pi._selected = false;
    });
    petaImage._selected = false;
    // const panel = createPetaPanel(petaImage, thumbnailPosition, this.imageWidth);
    //   this.$emit("addPanel", panel, worldPosition);
  }
  selectImage(petaImage: PetaImage) {
    // API.send("updatePetaImage", petaImage, true);
    petaImage._selected = !petaImage._selected;
  }
  async changeCategory(category: string, name: string) {
    name = name.replace(/\s+/g, "");
    let remove = false;
    if (name == "") {
      remove = await API.send("dialog", `Remove Category ${category}?`, ["Yes", "No"]) == 0;
    }
    if (this._categories.find((c) => c.name == name)) {
      API.send("dialog", `Category ${name} already exists.`, []);
      return;
    }
    const changed: PetaImage[] = [];
    this.petaImagesArray.forEach((pi) => {
      const index = pi.categories.indexOf(category);
      if (index >= 0) {
        if (remove) {
          pi.categories.splice(index, 1);
        } else {
          pi.categories[index] = name;
        }
        changed.push(pi);
      }
    });
    API.send("updatePetaImages", changed, UpdateMode.UPDATE);
    this.selectCategory(name);
  }
  clearSelectionAllImages() {
    this.petaImagesArray.forEach((pi) => {
      pi._selected = false;
    })
  }
  petaImageMenu(petaImage: PetaImage, position: Vec2) {
    petaImage._selected = true;
    GLOBAL.contextMenu.open([
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
  get petaImagesArray() {
    return Object.values(this.petaImages).sort(this.sort);
  }
  get selectedPetaImages() {
    return this.petaImagesArray.filter((pi) => pi._selected);
  }
  get uncategorizedImages() {
    return this.petaImagesArray.filter((d) => {
      return d.categories.length == 0;
    });
  }
  get filteredPetaImages() {
    if (this.selectUncategorized) {
      return this.uncategorizedImages;
    }
    const categories = this.selectedCategories.split(" ");
    return this.petaImagesArray.filter((d) => {
      let result = true;
      categories.filter(k => k != "").forEach((k) => {
        if (!d.categories.includes(k)) {
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
  get _categories() {
    const categories: {
      name: string,
      count: number
    }[] = [];
    this.petaImagesArray.forEach((pi) => {
      pi.categories.forEach((category) => {
        const c = categories.find((c) => category == c.name);
        if (!c) {
          categories.push({
            name: category,
            count: 1
          });
        } else {
          c.count++;
        }
      });
    });
    return [...categories];
  }
  get _petaThumbnails(): PetaThumbnail[] {
    // log("update thumbnails");
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
      const visible = (this.areaMinY < position.y && position.y < this.areaMaxY) || (this.areaMinY < position.y + height && position.y + height < this.areaMaxY);
      yList[mvi] += height;
      if (this.scrollHeight < yList[mvi]) {
        this.scrollHeight = yList[mvi];
      }
      return {
        petaImage: p,
        position: position,
        width: this.imageWidth,
        height: height,
        visible: visible
      }
    }).filter((p) => p.visible);
  }
}
</script>
