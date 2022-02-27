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
        <li v-for="tag in tags" :key="tag.id">
          <VEditableLabel
            :label="tag.name"
            :labelLook="`${tag.name}`"
            :growWidth="true"
            :readonly="true"
            @focus="complementTag"
            @click="selectTag(tag)"
            @contextmenu="tagMenu($event, tag)"
          />
        </li>
        <li class="add">
          <VEditableLabel
            :label="$t('browser.property.tagName')"
            :labelLook="$t('browser.property.clickToAddTag')"
            :growWidth="true"
            :clickToEdit="true"
            @change="(name) => addTag(name)"
            @focus="complementTag"
          />
        </li>
      </ul>
    </section>
    <section v-show="!noImage">
      <label>
        <input
          type="checkbox"
          :checked="nsfw"
          @change="changeNsfw(Boolean($event.target.checked))"
        >
          NSFW
        </label>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import VPropertyThumbnail from "@/rendererProcess/components/browser/VPropertyThumbnail.vue";
// Others
import { API, log } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { BrowserThumbnail } from "@/rendererProcess/components/browser/browserThumbnail";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { getPetaTagsOfPetaImage } from "@/rendererProcess/utils/getPetaTagsOfPetaImage";
@Options({
  components: {
    VEditableLabel,
    VPropertyThumbnail
  },
  emits: [
    "selectTag"
  ]
})
export default class VProperty extends Vue {
  @Prop()
  petaImages!: PetaImage[];
  @Prop()
  allPetaTags!: PetaTag[];
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
  addTag(name: string) {
    name = name.replace(/\s+/g, "");
    // タグを探す。なかったら作る。
    const petaTag = this.allPetaTags.find((petaTag) => petaTag.name == name) || createPetaTag(name);
    petaTag.petaImages.push(...this.petaImages.map((pi) => pi.id));
    API.send("updatePetaTags", [petaTag], UpdateMode.UPSERT);
  }
  removeTag(petaTag: PetaTag) {
    this.petaImages.forEach((petaImage) => {
      petaTag.petaImages = petaTag.petaImages.filter((id) => id != petaImage.id);
    });
    API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
  }
  clearSelection() {
    this.petaImages.forEach((pi) => {
      pi._selected = false;
    })
  }
  complementTag(event: FocusEvent) {
    this.$components.complement.open(event.target as HTMLInputElement, this.allPetaTags.map((petaTag) => petaTag.name));
  }
  tagMenu(event: MouseEvent, tag: PetaTag) {
    this.$components.contextMenu.open([
      {
        label: this.$t("browser.property.tagMenu.remove", [tag.name]),
        click: () => {
          this.removeTag(tag);
        }
      }
    ], vec2FromMouseEvent(event));
  }
  selectTag(tag: PetaTag) {
    this.$emit("selectTag", tag);
  }
  get tags(): PetaTag[] {
    if (this.noImage) {
      return [];
    }
    const tags: {[tag: string]: {
      count: number,
      petaTag: PetaTag
    }} = {};
    this.petaImages.forEach((pi) => {
      getPetaTagsOfPetaImage(pi, this.allPetaTags).forEach((tag) => {
        if (!tags[tag.id]) {
          tags[tag.id] = {
            count: 1,
            petaTag: tag
          }
          tags[tag.id].count = 1;
        } else {
          tags[tag.id].count++;
        }
      });
    });
    return Object.values(tags).filter((tag) => tag.count == this.petaImages.length).map((t) => t.petaTag);
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
  get nsfw() {
    let nsfw = false;
    let same = true;
    this.petaImages.forEach((pi, i) => {
      if (i == 0) {
        nsfw = pi.nsfw;
        return;
      }
      if (nsfw != pi.nsfw) {
        same = false;
      }
    })
    if (same) {
      return nsfw;
    }
    return "not-same";
  }
  changeNsfw(value: boolean) {
    this.petaImages.forEach((pi, i) => {
      pi.nsfw = value;
    });
    updatePetaImages(this.petaImages, UpdateMode.UPDATE);
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
        display: flex;
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