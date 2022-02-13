<template>
  <article class="property-root">
    <section
      class="previews"
      ref="previews"
      v-show="!noImage"
    >
      <VPropertyThumbnail
        v-for="(data) in browserThumbnails"
        :key="data.petaImage.id"
        :browserThumbnail="data"
      />
    </section>
    <p>{{$t("browser.property.selectedImage", [petaImages.length])}}</p>
    <section
      class="buttons"
      v-show="!noImage"
    >
      <button
        tabindex="-1"
        @click="clearSelection"
      >
        {{$t("browser.property.clearSelectionButton")}}
      </button>
    </section>
    <section v-show="!noImage" class="tags">
      <p>{{$t("browser.property.tags")}}</p>
      <ul>
        <li v-for="tag, i in tags" :key="i">
          <VEditableLabel
            :label="tag"
            :labelLook="`${tag}`"
            :growWidth="true"
            @change="(name) => changeTag(tag, name)"
            @focus="complementTag"
            @contextmenu="tagMenu($event, tag)"
          />
        </li>
        <li class="add">
          <VEditableLabel
            :label="''"
            :labelLook="$t('browser.property.clickToAddTag')"
            :growWidth="true"
            :clickToEdit="true"
            @change="(name) => changeTag('', name)"
            @focus="complementTag"
          />
        </li>
      </ul>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
import VPropertyThumbnail from "@/components/browser/VPropertyThumbnail.vue";
// Others
import { API, log } from "@/api";
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
import { MAX_PREVIEW_COUNT } from "@/defines";
import { PetaImage } from "@/datas/petaImage";
import { UpdateMode } from "@/datas/updateMode";
import { BrowserThumbnail } from "@/datas/browserThumbnail";
@Options({
  components: {
    VEditableLabel,
    VPropertyThumbnail
  },
  emits: [
    "changeTag"
  ]
})
export default class VProperty extends Vue {
  @Prop()
  petaImages!: PetaImage[];
  @Prop()
  allTags!: string[];
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
  changeTag(oldName: string, newName: string) {
    newName = newName.replace(/\s+/g, "");
    let changed = false;
    this.petaImages.forEach((pi) => {
      const index = pi.tags.indexOf(oldName);
      if (index < 0) {
        // 新規追加の場合
        if (pi.tags.indexOf(newName) < 0) {
          // 新規の名前が無ければ追加
          if (newName != "") {
            // 空欄じゃなければ追加
            pi.tags.push(newName);
            changed = true;
          }
        }
      } else {
        // 更新の場合
        if (newName == "") {
          // 空欄の場合削除
          pi.tags.splice(index, 1);
          changed = true;
        } else {
          // 空欄じゃなければ更新
          if (pi.tags.indexOf(newName) < 0) {
            // 新規の名前が無ければ追加
            pi.tags[index] = newName;
            changed = true;
          }
        }
        this.$emit("changeTag", oldName, newName);
      }
      pi.tags.sort();
    });
    API.send("savePetaImages", this.petaImages, UpdateMode.UPDATE);
    // if (changed) {
      // API.send("dialog", this.$t("browser.property.clearSelectionDialog"), [this.$t("shared.yes"), this.$t("shared.no")]).then((index) => {
      //   if (index == 0) {
      //     this.clearSelection();
      //   }
      // })
    // }
  }
  clearSelection() {
    this.petaImages.forEach((pi) => {
      pi._selected = false;
    })
  }
  complementTag(event: FocusEvent) {
    this.$globalComponents.complement.open(event.target as HTMLInputElement, this.allTags);
  }
  tagMenu(event: MouseEvent, tag: string) {
    this.$globalComponents.contextMenu.open([
      {
        label: this.$t("browser.property.tagMenu.remove", [tag]),
        click: () => {
          this.changeTag(tag, "");
        }
      }
    ], vec2FromMouseEvent(event));
  }
  get tags(): string[] {
    if (this.noImage) {
      return [];
    }
    const tags: {[tag: string]: number} = {};
    this.petaImages.forEach((pi) => {
      pi.tags.forEach((tag) => {
        if (!tags[tag]) {
          tags[tag] = 1;
        } else {
          tags[tag]++;
        }
      });
    });
    return [...Object.keys(tags).filter((tag) => tags[tag] == this.petaImages.length)];
  }
  get browserThumbnails(): BrowserThumbnail[] {
    const maxWidth = this.petaImages.length == 1 ? this.previewWidth : this.previewWidth * 0.7;
    const petaImages = [...this.petaImages];
    // プレビュー数の最大を抑える。
    petaImages.splice(0, petaImages.length - MAX_PREVIEW_COUNT);
    const thumbnails = petaImages.map((p, i) => {
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
        petaImages.length > 1 ? (this.previewWidth - last.width) * (i / (petaImages.length - 1)) : this.previewWidth / 2 - thumb.width / 2,
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

<style lang="scss" scoped>
.property-root {
  width: 100%;
  height: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >.previews {
    position: relative;
    width: 100%;
    height: 30%;
    overflow: hidden;
    border-radius: var(--rounded);
    box-shadow: 0px 0px 3px rgba($color: #000000, $alpha: 0.5);
    background-color: var(--bg-color);
  }
  >.buttons {
    text-align: center;
  }
  >.tags {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    ul {
      white-space: nowrap;
      padding: 0px;
      flex-grow: 1;
      overflow-y: scroll;
      overflow-x: hidden;
      >li {
        list-style-type: none;
        padding: 4px;
        font-weight: bold;
        cursor: pointer;
        &:hover * {
          text-decoration: underline;
        }
        &::before {
          width: 16px;
          display: inline-block;
          content: "・";
        }
        &.add::before {
          content: "＋";
        }
      }
    }
  }
  p {
    text-align: center;
    font-size: 1.0em;
  }
}
</style>