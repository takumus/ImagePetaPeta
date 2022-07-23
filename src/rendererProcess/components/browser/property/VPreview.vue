<template>
  <t-property-root>
    <t-previews
      ref="previews"
      v-show="!noImage"
    >
      <VPropertyThumbnail
        v-for="(data) in propertyThumbnails"
        :key="data.petaImage.id"
        :propertyThumbnail="data"
      />
    </t-previews>
    <p>{{$t("browser.property.selectedImage", [petaImages.length])}}</p>
    <t-buttons
      v-show="!noImage"
    >
      <button
        tabindex="-1"
        @click="clearSelection"
      >
        {{$t("browser.property.clearSelectionButton")}}
      </button>
      <button
        tabindex="-1"
        v-if="propertyThumbnails.length === 1"
        @click="openDetails"
      >
        {{$t("browser.property.openDetailsButton")}}
      </button>
    </t-buttons>
  </t-property-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VPropertyThumbnail from "@/rendererProcess/components/browser/property/VPropertyThumbnail.vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT, UNTAGGED_ID } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { PropertyThumbnail } from "@/rendererProcess/components/browser/property/propertyThumbnail";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
@Options({
  components: {
    VPropertyThumbnail
  },
  emits: [
    "selectTag"
  ]
})
export default class VPreview extends Vue {
  @Prop()
  petaImages!: PetaImage[];
  @Ref("previews")
  previews!: HTMLElement;
  previewWidth = 0;
  previewHeight = 0;
  previewsResizer?: ResizeObserver;
  mounted() {
    this.previewsResizer = new ResizeObserver((entries) => {
      this.resizePreviews(entries[0]!.contentRect);
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
  clearSelection() {
    this.petaImages.forEach((pi) => {
      pi._selected = false;
    })
  }
  openDetails() {
    const petaImage = this.petaImages[0];
    if (petaImage) {
      API.send("setDetailsPetaImage", petaImage);
      API.send("openWindow", WindowType.DETAILS);
    }
  }
  get propertyThumbnails(): PropertyThumbnail[] {
    const maxWidth = this.petaImages.length === 1 ? this.previewWidth : this.previewWidth * 0.7;
    const petaImages = [...this.petaImages];
    // プレビュー数の最大を抑える。
    petaImages.splice(0, petaImages.length - MAX_PREVIEW_COUNT);
    const thumbnails = petaImages.map((p, i): PropertyThumbnail => {
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
        height: height
      }
    });
    const last = thumbnails[thumbnails.length - 1]!;
    thumbnails.forEach((thumb, i) => {
      thumb.position = new Vec2(
        petaImages.length > 1 ? (this.previewWidth - last.width) * (i / (petaImages.length - 1)) : this.previewWidth / 2 - thumb.width / 2,
        this.previewHeight / 2 - thumb.height / 2
      )
    });
    return thumbnails;
  }
  get noImage() {
    return this.petaImages.length === 0;
  }
}
</script>

<style lang="scss" scoped>
t-property-root {
  width: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >t-previews {
    position: relative;
    width: 100%;
    height: 150px;
    overflow: hidden;
    display: block;
  }
  >t-buttons {
    text-align: center;
    display: block;
  }
  p {
    text-align: center;
    font-size: 1.0em;
    margin: 4px 0px;
  }
}
</style>