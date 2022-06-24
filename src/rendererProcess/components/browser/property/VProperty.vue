<template>
  <t-property-root>
    <t-infos v-if="singlePetaImageInfo">
      <p>{{$t("browser.property.infos.label")}}</p>
      {{$t("browser.property.infos.name")}}: {{singlePetaImageInfo.name}}<br>
      {{$t("browser.property.infos.fileDate")}}: {{singlePetaImageInfo.fileDate}}<br>
      {{$t("browser.property.infos.addDate")}}: {{singlePetaImageInfo.addDate}}<br>
       <t-palette>
        <t-color-background>
          <t-color
            v-for="color in singlePetaImageInfo.palette"
            :key="color.id"
            :style="{
              backgroundColor: color.color,
              flex: 1//Math.floor(color.population * 70 + 30)
            }"
          >
          </t-color>
        </t-color-background>
      </t-palette>
    </t-infos>
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
            :label="''"
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
          @change="changeNSFW(Boolean($event.target.checked))"
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
import { MAX_PREVIEW_COUNT, UNTAGGED_ID } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PropertyThumbnail } from "@/rendererProcess/components/browser/property/propertyThumbnail";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import dateFormat from "dateformat";
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
  fetchingTags = true;
  mounted() {
    //
  }
  unmounted() {
    //
  }
  async addTag(name: string) {
    // タグを探す。なかったら作る。
    let petaTag = this.petaTagInfos.find((pti) => pti.petaTag.name == name)?.petaTag;
    // リクエスト2回飛ばさない
    if (!petaTag) {
      petaTag = createPetaTag(name);
      await API.send(
        "updatePetaTags",
        [petaTag],
        UpdateMode.UPSERT
      );
    }
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
    this.$components.complement.open(editableLabel, this.petaTagInfos.filter((pti) => {
      return pti.petaTag.id !== UNTAGGED_ID;
    }).map((pti) => {
      return pti.petaTag.name;
    }));
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
  get singlePetaImageInfo() {
    if (this.petaImages.length == 1) {
      const petaImage = this.petaImages[0]!;
      return {
        name: petaImage.name,
        fileDate: dateFormat(petaImage.fileDate, "yyyy/mm/dd hh:MM:ss"),
        addDate: dateFormat(petaImage.addDate, "yyyy/mm/dd hh:MM:ss"),
        palette: petaImage.palette.map((color, i) => {
          return {
            color: `rgb(${color.r}, ${color.g}, ${color.b})`,
            population: color.population,
            id: i
          };
        })
      }
    }
    return undefined;
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
  changeNSFW(value: boolean) {
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
  flex: 1;
  width: 100%;
  height: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >t-infos {
    display: block;
    word-break: break-all;
    >t-palette {
      pointer-events: none;
      padding: 8px;
      display: block;
      width: 100%;
      >t-color-background {
        display: flex;
        // background-color: rgba($color: (#000000), $alpha: 0.5);
        border-radius: var(--rounded);
        height: 8px;
        width: 100%;
        overflow: hidden;
        // border: solid 4px rgba($color: #000000, $alpha: 0.5);
        box-shadow: 0px 0px 2px 1px rgba(0, 0, 0, 0.4);
        >t-color {
          // width: 8px;
          height: 100%;
          // margin: 0px 4px;
          display: block;
          // border-radius: 10px;
        }
      }
    }
  }
  >t-tags {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    ul {
      white-space: nowrap;
      padding: 0px;
      margin: 0px;
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
    margin: 4px 0px;
  }
}
</style>