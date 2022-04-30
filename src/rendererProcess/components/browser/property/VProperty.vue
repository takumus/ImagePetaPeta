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
    </t-buttons>
    <t-tags v-show="!noImage">
      <p>{{$t("browser.property.tags")}}</p>
      <ul v-if="!fetchingTags">
        <li v-for="tag in sharedPetaTags" :key="tag.id">
          <VEditableLabel
            :label="tag.name"
            :labelLook="`${tag.name}`"
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
            :clickToEdit="true"
            @change="(name) => addTag(name)"
            @focus="complementTag"
          />
        </li>
      </ul>
      <ul v-else>
        <li>
          {{$t("browser.property.fetchingTags")}}
        </li>
      </ul>
    </t-tags>
    <section v-show="!noImage">
      <label>
        <input
          type="checkbox"
          tabindex="-1"
          :checked="nsfw"
          @change="changeNsfw(Boolean($event.target.checked))"
        >
          NSFW
        </label>
    </section>
  </t-property-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import VPropertyThumbnail from "@/rendererProcess/components/browser/property/VPropertyThumbnail.vue";
// Others
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PropertyThumbnail } from "@/rendererProcess/components/browser/property/propertyThumbnail";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
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
  petaTagInfos!: PetaTagInfo[];
  @Ref("previews")
  previews!: HTMLElement;
  previewWidth = 0;
  previewHeight = 0;
  previewsResizer?: ResizeObserver;
  fetchingTags = true;
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
  async addTag(name: string) {
    // タグを探す。なかったら作る。
    const petaTag = this.petaTagInfos.find((pti) => pti.petaTag.name == name)?.petaTag || createPetaTag(name);
    // petaTag.petaImages.push(...this.petaImages.map((pi) => pi.id));
    await API.send(
      "updatePetaTags",
      [petaTag],
      UpdateMode.UPSERT
    );
    await API.send(
      "updatePetaImagesPetaTags",
      this.petaImages.map((petaImage) => petaImage.id),
      [petaTag.id],
      UpdateMode.UPSERT
    );
  }
  async removeTag(petaTag: PetaTag) {
    await API.send(
      "updatePetaImagesPetaTags",
      this.petaImages.map((petaImage) => petaImage.id),
      [petaTag.id],
      UpdateMode.REMOVE
    );
  }
  clearSelection() {
    this.petaImages.forEach((pi) => {
      pi._selected = false;
    })
  }
  complementTag(editableLabel: VEditableLabel) {
    this.$components.complement.open(editableLabel, this.petaTagInfos.map((pti) => pti.petaTag.name));
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
  sharedPetaTags: PetaTag[] = [];
  async fetchPetaTags() {
    this.fetchingTags = true;
    if (this.noImage) {
      this.sharedPetaTags = [];
      this.fetchingTags = false;
      return;
    }
    const result = await API.send("getPetaTagIdsByPetaImageIds", this.petaImages.map((petaImage) => petaImage.id));
    this.sharedPetaTags = this.petaTagInfos.filter((pti) => result.find((id) => id == pti.petaTag.id)).map((pi) => pi.petaTag);
    this.fetchingTags = false;
  }
  get propertyThumbnails(): PropertyThumbnail[] {
    const maxWidth = this.petaImages.length == 1 ? this.previewWidth : this.previewWidth * 0.7;
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
  @Watch("petaImages")
  changePetaImages() {
    this.fetchPetaTags();
  }
  @Watch("petaTagInfos")
  changeFetchTags() {
    this.fetchPetaTags();
  }
}
</script>

<style lang="scss" scoped>
t-property-root {
  width: 100%;
  height: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >t-previews {
    position: relative;
    width: 100%;
    height: 30%;
    overflow: hidden;
    display: block;
  }
  >t-buttons {
    text-align: center;
    display: block;
  }
  >t-tags {
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
        cursor: pointer;
        display: flex;
        &:hover * {
          text-decoration: underline;
        }
        &::before {
          width: 16px;
          display: inline-block;
          line-height: 1.5em;
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