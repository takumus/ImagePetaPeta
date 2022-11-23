<template>
  <t-search-root>
    <t-search-box>
      <t-tag v-for="tag in selectedPetaTags" :key="tag.id">
        <VTextarea
          :type="'single'"
          :trim="true"
          :clickToEdit="true"
          :allowEmpty="true"
          :complements="complementItems"
          :blurToReset="true"
          :value="tag.name"
          :look="tag.name"
          @update:value="(value) => editSearchTag(tag, value)"
          @deleteOfEmpty="editSearchTag(tag, '')" />
      </t-tag>
      <t-tag v-if="selectedFilterType === FilterType.ALL">
        <VTextarea :type="'single'" :trim="true" :value="t('browser.all')" :readonly="true" />
      </t-tag>
      <t-tag v-if="selectedFilterType === FilterType.UNTAGGED">
        <VTextarea :type="'single'" :trim="true" :value="t('browser.untagged')" :readonly="true" />
      </t-tag>
      <t-tag class="last">
        <VTextarea
          :type="'single'"
          :trim="true"
          :clickToEdit="true"
          :complements="complementItems"
          :textAreaStyle="{ width: '100%' }"
          :outerStyle="{ width: '100%' }"
          :blurToReset="true"
          :look="textsStore.state.value.plus"
          :noOutline="true"
          @update:value="addSelectedTag"
          @deleteOfEmpty="removeLastPetaTag()"
          ref="searchInput" />
      </t-tag>
    </t-search-box>
  </t-search-root>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTextarea from "@/renderer/components/utils/textarea/VTextarea.vue";

import { RPetaTag } from "@/commons/datas/rPetaTag";

import { FilterType } from "@/renderer/components/browser/filterType";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

const { t } = useI18n();
const searchInput = ref<InstanceType<typeof VTextarea>>();
const petaTagsStore = usePetaTagsStore();
const textsStore = useTextsStore();
const props = defineProps<{
  selectedPetaTagIds: string[];
  selectedFilterType: FilterType;
}>();

const emit = defineEmits<{
  (e: "update:selectedPetaTagIds", value: string[]): void;
  (e: "update:selectedFilterType", selectedFilterType: FilterType): void;
}>();

function editSearchTag(tag: RPetaTag, value: string) {
  const index = props.selectedPetaTagIds.findIndex((id) => id === tag.id);
  const _selectedPetaTagIds = [...props.selectedPetaTagIds];
  _selectedPetaTagIds.splice(index, 1);
  if (value != "") {
    const petaTag = petaTagsStore.state.petaTags.value.find((pti) => pti.name === value);
    if (petaTag && !_selectedPetaTagIds.includes(petaTag.id)) {
      _selectedPetaTagIds.splice(index, 0, petaTag.id);
    }
  }
  emit("update:selectedPetaTagIds", _selectedPetaTagIds);
}

function removeLastPetaTag() {
  if (props.selectedFilterType !== FilterType.TAGS) {
    emit("update:selectedFilterType", FilterType.TAGS);
  }
  const last = props.selectedPetaTagIds[props.selectedPetaTagIds.length - 1];
  if (last) {
    const petaTag = petaTagsStore.state.petaTags.value.find((tag) => tag.id === last);
    if (petaTag !== undefined) {
      editSearchTag(petaTag, "");
    }
  } else {
    // blur();
  }
}

function addSelectedTag(tagName: string) {
  if (props.selectedFilterType !== FilterType.TAGS) {
    emit("update:selectedFilterType", FilterType.TAGS);
  }
  const petaTag = petaTagsStore.state.petaTags.value.find((pti) => pti.name === tagName);
  if (petaTag && !props.selectedPetaTagIds.includes(petaTag.id)) {
    emit("update:selectedPetaTagIds", [...props.selectedPetaTagIds, petaTag.id]);
  }

  setTimeout(() => {
    searchInput.value?.edit();
  });
}

const complementItems = computed(() => {
  if (props.selectedFilterType !== FilterType.TAGS) {
    return petaTagsStore.state.petaTags.value.map((pti) => pti.name);
  }
  return petaTagsStore.state.petaTags.value
    .filter((pti) => !props.selectedPetaTagIds.includes(pti.id))
    .map((pti) => pti.name);
});

const selectedPetaTags = computed(() => {
  if (props.selectedFilterType !== FilterType.TAGS) {
    return [];
  }
  return props.selectedPetaTagIds
    .map((id) => {
      return petaTagsStore.state.petaTags.value.find((tag) => tag.id === id);
    })
    .filter((petaTag) => petaTag !== undefined) as RPetaTag[];
});
</script>

<style lang="scss" scoped>
t-search-root {
  display: block;
  text-align: center;
  width: 100%;
  > t-search-box {
    border-radius: var(--rounded);
    border: solid 1.2px var(--color-border);
    outline: none;
    padding: var(--px-1) var(--px-1) 0px 0px;
    width: 100%;
    height: 100%;
    word-break: break-word;
    text-align: left;
    // text-align: center;
    // display: block;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    > t-tag {
      display: inline-block;
      margin: 0px 0px var(--px-1) var(--px-1);
      border-radius: var(--rounded);
      padding: var(--px-1);
      background-color: var(--color-1);
      box-shadow: var(--shadow-small);
      // border: solid 1.2px var(--color-border);
      &.last {
        width: 100%;
        background-color: unset;
        flex: 1 1 64px;
        box-shadow: unset;
      }
    }
  }
}
</style>
<!-- const aaa = function () {

} -->
