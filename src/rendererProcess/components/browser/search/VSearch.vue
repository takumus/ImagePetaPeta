<template>
  <article class="search-root">
    <span
      v-for="tag in selectedPetaTags"
      :key="tag.id"
      class="selectedTag"
    >
      <VEditableLabel
        :label="tag.name"
        :labelLook="tag.label"
        :clickToEdit="true"
        :allowEmpty="true"
        @focus="complementTag"
        @change="(value) => editSearchTag(tag, value)"
        @delete="editSearchTag(tag, '')"
      />
    </span>
    <span class="selectedTag last">
      <VEditableLabel
        :label="''"
        :labelLook="$texts.plus + '       '"
        :clickToEdit="true"
        @change="addSelectedTag"
        @focus="complementTag"
        @delete="removeLastPetaTag()"
        :growWidth="true"
        :noOutline="true"
        ref="searchInput"
      />
    </span>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";

// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";

// Others
import { PetaTag } from "@/commons/datas/petaTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { API } from "@/rendererProcess/api";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UNTAGGED_ID } from "@/commons/defines";
import { blur } from "@/rendererProcess/utils/blur";
@Options({
  components: {
    VEditableLabel
  },
  emits:[
  ]
})
export default class VSearch extends Vue {
  @Ref("searchInput")
  searchInput!: VEditableLabel;
  @Prop()
  petaTagInfos: PetaTagInfo[] = [];
  @Prop()
  selectedPetaTags: PetaTag[] = [];
  mounted() {
    //
  }
  unmounted() {
    //
  }
  async removeTag(petaTag: PetaTag) {
    if (await this.$components.dialog.show(this.$t("browser.removeTagDialog", [petaTag.name]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
      await API.send("updatePetaTags", [petaTag], UpdateMode.REMOVE);
    }
  }
  removeLastPetaTag() {
    const last = this.selectedPetaTags[this.selectedPetaTags.length - 1];
    if (last) {
      this.editSearchTag(last, "");
    } else {
      blur();
    }
  }
  editSearchTag(tag: PetaTag, value: string) {
    value = value.trim().replace(/\r?\n/g, "");
    const index = this.selectedPetaTags.findIndex((petaTag) => petaTag == tag);
    this.selectedPetaTags.splice(index, 1);
    if (value != "") {
      const petaTag = this.petaTagInfos.find((pti) => pti.petaTag.name == value)?.petaTag;
      if (petaTag && !this.selectedPetaTags.includes(petaTag)) {
        this.selectedPetaTags.splice(index, 0, petaTag);
      }
    }
  }
  addSelectedTag(tagName: string) {
    const petaTag = this.petaTagInfos.find((pti) => pti.petaTag.name == tagName)?.petaTag;
    const untaggedId = this.selectedPetaTags.findIndex((petaTag) => petaTag.id === UNTAGGED_ID);
    if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
      this.selectedPetaTags.length = 0;
    }
    if (petaTag && !this.selectedPetaTags.includes(petaTag)) {
      this.selectedPetaTags.push(petaTag);
    }
    this.$nextTick(() => {
      this.searchInput.edit();
    });
  }
  complementTag(editableLabel: VEditableLabel) {
    this.$components.complement.open(editableLabel, this.complementItems);
  }
  get complementItems() {
    return this.petaTagInfos.filter((pti) => {
      return !this.selectedPetaTags.includes(pti.petaTag)
    }).map((pti) => {
      return pti.petaTag.name;
    });
  }
  @Watch("complementItems")
  updateComplements() {
    this.$components.complement.updateItems(this.complementItems);
  }
}
</script>

<style lang="scss" scoped>
.search-root {
  border-radius: var(--rounded);
  border: solid 1.2px var(--border-color);
  outline: none;
  padding: 4px 4px 0px 0px;
  font-size: 1.0em;
  width: 100%;
  word-break: break-all;
  white-space: pre-wrap;
  text-align: left;
  // text-align: center;
  // display: block;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  >.selectedTag {
    display: inline-block;
    margin: 0px 0px 4px 4px;
    border-radius: var(--rounded);
    padding: 4px;
    background-color: var(--tab-bg-color);
    // border: solid 1.2px var(--border-color);
    &.last {
      width: 100%;
      background-color: unset;
      flex: 1 1 64px;
    }
  }
}
</style>