<template>
  <t-tags-root>
    <t-tags>
      <t-tag @click="selectPetaTag()" :class="{ selected: selectedAll }">
        <VEditableLabel :label="`${$t('browser.all')}(${petaImagesArray.length})`" :readonly="true" />
      </t-tag>
      <t-tag
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :class="{ selected: c.selected }"
        @click="selectPetaTag(c.petaTag)"
      >
        <VEditableLabel
          :label="c.petaTag.name"
          :labelLook="`${c.petaTag.name}(${c.count})`"
          :readonly="c.readonly"
          @change="(name) => changeTag(c.petaTag, name)"
          @contextmenu="tagMenu($event, c)"
        />
      </t-tag>
    </t-tags>
    <t-tag-add>
      <t-tag>
        <VEditableLabel
          :label="''"
          :labelLook="$texts.plus + '       '"
          :clickToEdit="true"
          @change="(name) => addTag(name)"
          :growWidth="true"
          :noOutline="true"
        />
      </t-tag>
    </t-tag-add>
  </t-tags-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";

// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";

// Others
import { PetaImage } from "@/commons/datas/petaImage";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { BrowserTag } from "@/rendererProcess/components/browser/browserTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { API } from "@/rendererProcess/api";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UNTAGGED_ID } from "@/commons/defines";
@Options({
  components: {
    VEditableLabel,
  },
  emits: [],
})
export default class VTags extends Vue {
  @Prop()
  petaImagesArray: PetaImage[] = [];
  @Prop()
  petaTagInfos: PetaTagInfo[] = [];
  @Prop()
  selectedPetaTags: PetaTag[] = [];
  tempSelectedTags = "";
  keyboards = new Keyboards();
  mounted() {
    //
  }
  unmounted() {
    //
  }
  tagMenu(event: PointerEvent, tag: BrowserTag) {
    if (tag.readonly) {
      return;
    }
    this.$components.contextMenu.open(
      [
        {
          label: this.$t("browser.tagMenu.remove", [tag.petaTag.name]),
          click: () => {
            this.removeTag(tag.petaTag);
          },
        },
      ],
      vec2FromPointerEvent(event),
    );
  }
  async addTag(name: string) {
    if (this.petaTagInfos.find((pi) => pi.petaTag.name === name)) {
      return;
    }
    API.send("updatePetaTags", [createPetaTag(name)], UpdateMode.UPSERT);
  }
  async removeTag(petaTag: PetaTag) {
    if (
      (await this.$components.dialog.show(this.$t("browser.removeTagDialog", [petaTag.name]), [
        this.$t("shared.yes"),
        this.$t("shared.no"),
      ])) === 0
    ) {
      await API.send("updatePetaTags", [petaTag], UpdateMode.REMOVE);
      const index = this.selectedPetaTags.findIndex((pt) => pt === petaTag);
      if (index >= 0) {
        this.selectedPetaTags.splice(index, 1);
      }
    }
  }
  async changeTag(petaTag: PetaTag, newName: string) {
    if (petaTag.name === newName) {
      return;
    }
    if (this.browserTags.find((c) => c.petaTag.name === newName)) {
      this.$components.dialog.show(this.$t("browser.tagAlreadyExistsDialog", [newName]), [this.$t("shared.yes")]);
      return;
    }
    petaTag.name = newName;
    await API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
    this.selectPetaTag(petaTag);
  }
  selectPetaTag(petaTag?: PetaTag, single = false) {
    if (
      !Keyboards.pressedOR("ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight") ||
      single
    ) {
      this.selectedPetaTags.length = 0;
    }
    const untaggedId = this.selectedPetaTags.findIndex((petaTag) => petaTag.id === UNTAGGED_ID);
    if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
      this.selectedPetaTags.length = 0;
    }
    if (petaTag && !this.selectedPetaTags.includes(petaTag)) {
      this.selectedPetaTags.push(petaTag);
    }
  }
  get browserTags(): BrowserTag[] {
    const browserTags = this.petaTagInfos.map((petaTagInfo): BrowserTag => {
      return {
        petaTag: petaTagInfo.petaTag,
        count: petaTagInfo.count,
        selected: this.selectedPetaTags.find((spt) => spt.id === petaTagInfo.petaTag.id) !== undefined,
        readonly: petaTagInfo.petaTag.id === UNTAGGED_ID,
      };
    });
    return browserTags;
  }
  get selectedAll() {
    return this.selectedPetaTags.length === 0;
  }
}
</script>

<style lang="scss" scoped>
t-tags-root {
  flex-direction: column;
  text-align: center;
  display: flex;
  width: 100%;
  height: 100%;
  > t-tag-add {
    padding: 4px 4px 0px 0px;
    > t-tag {
      // margin: 0px 0px 4px 4px;
      padding: 4px;
    }
  }
  > t-tags {
    // border-radius: var(--rounded);
    // border: solid 1.2px var(--color-border);
    outline: none;
    padding: 4px 4px 0px 0px;
    width: 100%;
    // word-break: break-word;
    text-align: left;
    // text-align: center;
    // display: block;
    // display: flex;
    // flex-direction: column;
    // flex-wrap: wrap;
    // justify-content: left;
    overflow-y: auto;
    > t-tag {
      display: block;
      width: fit-content;
      margin: 0px 0px 4px 4px;
      border-radius: var(--rounded);
      padding: 4px;
      background-color: var(--color-sub);
      &.selected {
        font-weight: bold;
        font-size: var(--size-2);
      }
    }
  }
}
</style>
