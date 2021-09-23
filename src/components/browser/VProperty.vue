<template>
  <div class="property-root">
    <section class="previews" ref="previews" v-show="!noImage">
      <VPropertyThumbnail
        v-for="(data) in _petaThumbnails"
        :key="data.petaImage.id"
        :petaThumbnail="data"
      />
    </section>
    <p>{{petaImages.length}} Images Selected.</p>
    <section class="buttons" v-show="!noImage">
      <button tabindex="-1" @click="clearSelection">Clear Selection</button>
    </section>
    <p v-show="!noImage">Categories</p>
    <ul>
      <li v-for="category, i in _categories" :key="i">
        <VEditableLabel :label="category" :labelLook="`・${category}`" @change="(name) => changeCategory(category, name)" @focus="complementCategory" :growWidth="true" />
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.property-root {
  width: 100%;
  height: 100%;
  color: #333333;
  position: relative;
  .previews {
    position: relative;
    width: 100%;
    height: 30%;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0px 0px 3px rgba($color: #000000, $alpha: 0.5);
  }
  .buttons {
    text-align: center;
  }
  ul {
    padding: 0px;
    li {
      list-style-type: none;
      background-color: #ffffff;
      // border: solid 2px;
      color: #333333;
      padding: 4px;
      font-weight: bold;
      cursor: pointer;
      color: #333333;
      &:hover * {
        text-decoration: underline;
      }
    }
  }
  p {
    text-align: center;
    font-size: 1.0em;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
import VPropertyThumbnail from "@/components/browser/VPropertyThumbnail.vue";
// Others
import { PetaImage, UpdateMode, PetaThumbnail } from "@/datas";
import { API, log } from "@/api";
import { Vec2 } from "@/utils";
import GLOBALS from "@/globals";
@Options({
  components: {
    VEditableLabel,
    VPropertyThumbnail
  },
  emits: [
    "changeCategory"
  ]
})
export default class VProperty extends Vue {
  @Prop()
  petaImages!: PetaImage[];
  @Prop()
  allCategories!: string[];
  @Ref("previews")
  previews!: HTMLElement;
  previewWidth = 0;
  previewHeight = 0;
  previewsResizer?: ResizeObserver;
  mounted() {
    this.previewsResizer = new ResizeObserver((entries) => {
      this.resizePreviews(entries[0].contentRect);
    });
    this.previewsResizer.observe(this.previews);
  }
  unmounted() {
    this.previewsResizer?.unobserve(this.previews);
    this.previewsResizer?.disconnect();
  }
  resizePreviews(rect: DOMRectReadOnly) {
    this.previewWidth = rect.width;
    this.previewHeight = rect.height;
  }
  changeCategory(oldName: string, newName: string) {
    newName = newName.replace(/\s+/g, "");
    let changed = false;
    this.petaImages.forEach((pi) => {
      const index = pi.categories.indexOf(oldName);
      if (index < 0) {
        // 新規追加の場合
        if (pi.categories.indexOf(newName) < 0) {
          // 新規の名前が無ければ追加
          if (newName != "") {
            // 空欄じゃなければ追加
            pi.categories.push(newName);
            changed = true;
          }
        }
      } else {
        // 更新の場合
        if (newName == "") {
          // 空欄の場合削除
          pi.categories.splice(index, 1);
          changed = true;
        } else {
          // 空欄じゃなければ更新
          if (pi.categories.indexOf(newName) < 0) {
            // 新規の名前が無ければ追加
            pi.categories[index] = newName;
            changed = true;
          }
        }
        this.$emit("changeCategory", oldName, newName);
      }
      pi.categories.sort();
    });
    API.send("updatePetaImages", this.petaImages, UpdateMode.UPDATE);
    if (changed) {
      API.send("dialog", "Clear Selection?", ["Yes", "No"]).then((index) => {
        if (index == 0) {
          this.clearSelection();
        }
      })
    }
  }
  clearSelection() {
    this.petaImages.forEach((pi) => {
      pi._selected = false;
    })
  }
  complementCategory(event: FocusEvent) {
    GLOBALS.complement.open(event.target as HTMLInputElement, this.allCategories);
  }
  get _categories(): string[] {
    if (this.noImage) {
      return [];
    }
    const categories: {[category: string]: number} = {};
    this.petaImages.forEach((pi) => {
      pi.categories.forEach((category) => {
        if (!categories[category]) {
          categories[category] = 1;
        } else {
          categories[category]++;
        }
      });
    });
    return [...Object.keys(categories).filter((category) => categories[category] == this.petaImages.length), "..."];
  }
  get _petaThumbnails(): PetaThumbnail[] {
    const maxWidth = this.petaImages.length == 1 ? this.previewWidth : this.previewWidth * 0.7;
    const thumbnails = this.petaImages.map((p, i) => {
      let width = 0;
      let height = 0;
      if (p.height / p.width < this.previewHeight / maxWidth) {
        width = maxWidth;
        height = maxWidth * p.height;
      } else {
        height = this.previewHeight;
        width = this.previewHeight / p.height;
      }
      return {
        petaImage: p,
        position: new Vec2(0, 0),
        width: width,
        height: height,
        visible: true
      }
    });
    const last = thumbnails[thumbnails.length - 1];
    thumbnails.forEach((thumb, i) => {
      thumb.position = new Vec2(
        this.petaImages.length > 1 ? (this.previewWidth - last.width) * (i / (this.petaImages.length - 1)) : this.previewWidth / 2 - thumb.width / 2,
        this.previewHeight / 2 - thumb.height / 2
      )
    });
    return thumbnails;
  }
  get noImage() {
    return this.petaImages.length == 0;
  }
}
</script>
