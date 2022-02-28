<template>
  <article class="tags-root">
    <header>
      <!-- <input
        class="search"
        type="text"
        v-model="selectedTags"
      > -->
      <VEditableLabel
        :label="selectedTags"
        :clickToEdit="true"
        @change="(tags) => selectedTags = tags"
        :growWidth="true"
        :noOutline="true"
      />
    </header>
    <ul>
      <li
        @click="selectTag('')"
        :class="{ selected: selectedAll }"
      >
        <VEditableLabel
          :label="`${$t('browser.all')}(${petaImagesArray.length})`"
          :readonly="true"
        />
      </li>
      <li
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :class="{ selected: c.selected }"
        @click="selectTag(c.petaTag.name)"
      >
        <VEditableLabel
          :label="c.petaTag.name"
          :labelLook="`${c.petaTag.name}(${c.count})`"
          :readonly="c.readonly"
          @change="(name) => changeTag(c.petaTag, name)"
          @contextmenu="tagMenu($event, c.petaTag)"
        />
      </li>
    </ul>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";

// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";

// Others
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaTag } from "@/commons/datas/petaTag";
import { getPetaTagsOfPetaImage } from "@/rendererProcess/utils/getPetaTagsOfPetaImage";
import { UNTAGGED_TAG_NAME } from "@/commons/defines";
import { BrowserTag } from "@/rendererProcess/components/browser/browserTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { API } from "@/rendererProcess/api";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
@Options({
  components: {
    VEditableLabel
  },
  emits:[
    "changeSelectedPetaTags"
  ]
})
export default class VTags extends Vue {
  @Prop()
  petaImagesArray: PetaImage[] = [];
  @Prop()
  petaTags: PetaTag[] = [];
  @Prop()
  selectedPetaTags: PetaTag[] = [];
  selectedTags = "";
  keyboards = new Keyboards();
  mounted() {
    this.keyboards.enabled = true;
  }
  unmounted() {
    this.keyboards.destroy();
  }
  complementTag(event: FocusEvent) {
    this.$components.complement.open(event.target as HTMLInputElement, this.browserTags.map((c) => c.petaTag.name));
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
    if (this.browserTags.find((c) => c.petaTag.name == newName)) {
      this.$components.dialog.show(this.$t("browser.tagAlreadyExistsDialog", [newName]), [this.$t("shared.yes")]);
      return;
    }
    petaTag.name = newName;
    await API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
    this.selectTag(newName);
  }
  selectTag(tag: string, single = false) {
    const tagNames = [...this.selectedPetaTags.map((petaTag) => petaTag.name)];
    const index = tagNames.indexOf(tag);
    if (index < 0) {
      if (!this.keyboards.isPressed("shift") || single) {
        tagNames.length = 0;
      }
      tagNames.push(tag);
      this.selectedTags = tagNames.join(" ");
    } else {
      if (!this.keyboards.isPressed("shift") || single) {
        tagNames.length = 0;
        tagNames.push(tag);
      } else {
        tagNames.splice(index, 1);
      }
      this.selectedTags = tagNames.join(" ");
    }
    // this.$emit("changeTags", this.selectedTagNameArray);
  }
  get browserTags(): BrowserTag[] {
    const browserTags = this.petaTags.map((petaTag): BrowserTag => {
      return {
        petaTag: petaTag,
        count: petaTag.petaImages.filter((id) => this.petaImagesArray.find((petaImage) => petaImage.id == id)).length,
        selected: this.selectedPetaTags.indexOf(petaTag) >= 0,
        readonly: false
      };
    })
    browserTags.sort((a, b) => {
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
      selected: this.selectedPetaTags.find((petaTag) => petaTag.id == "untagged") != undefined,
      readonly: true
    }, ...browserTags];
  }
  get tagsForComplement() {
    return this.browserTags.filter((c) => c.petaTag.name != UNTAGGED_TAG_NAME).map(c => c.petaTag.name);
  }
  get uncategorizedImages() {
    return this.petaImagesArray.filter((petaImage) => {
      return getPetaTagsOfPetaImage(petaImage, this.petaTags).length == 0;
    });
  }
  get selectedAll() {
    return this.selectedPetaTags.length == 0;
  }
  @Watch("selectedTags")
  changeSelectedTags() {
    const selectedTags = this.selectedTags.split(" ")
    .map((tagName) => {
      return this.browserTags.find((browserTag) => {
        return browserTag.petaTag.name == tagName;
      });
    }).filter((browserTag) => {
      return browserTag != undefined;
    }).map((browserTag) => {
      return browserTag?.petaTag;
    });
    this.$emit("changeSelectedPetaTags", selectedTags);
  }
  @Watch("selectedPetaTags", {deep: true})
  changeSelectedPetaTags() {
    this.selectedTags = this.selectedPetaTags.map((petaTag) => petaTag.name).join(" ");
  }
}
</script>

<style lang="scss" scoped>
.tags-root {
  flex-direction: column;
  text-align: center;
  white-space: nowrap;
  display: flex;
  width: 100%;
  height: 100%;
  >header {
    border-radius: var(--rounded);
    border: solid 1.2px #333333;
    outline: none;
    padding: 4px;
    font-weight: bold;
    font-size: 1.0em;
    width: 100%;
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
</style>