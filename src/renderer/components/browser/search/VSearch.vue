<template>
  <e-search-root>
    <e-search-box>
      <e-tag v-for="tag in selectedPetaTags" :key="tag.id">
        <VTextarea
          :type="'single'"
          :trim="true"
          :click-to-edit="true"
          :allow-empty="true"
          :complements="complementItems"
          :blur-to-reset="true"
          :value="tag.name"
          :look="tag.name"
          @update:value="(value) => editSearchTag(tag, value)"
          @delete-of-empty="editSearchTag(tag, '')" />
      </e-tag>
      <e-tag v-if="selectedFilterType === FilterType.ALL">
        <VTextarea :type="'single'" :trim="true" :value="t('browser.all')" :readonly="true" />
      </e-tag>
      <e-tag v-if="selectedFilterType === FilterType.UNTAGGED">
        <VTextarea :type="'single'" :trim="true" :value="t('browser.untagged')" :readonly="true" />
      </e-tag>
      <e-tag class="last">
        <VTextarea
          :type="'single'"
          :trim="true"
          :click-to-edit="true"
          :complements="complementItems"
          :text-area-style="{ width: '100%' }"
          :outer-style="{ width: '100%' }"
          :blur-to-reset="true"
          :look="textsStore.state.value.plus"
          :no-outline="true"
          @update:value="addSelectedTag"
          @delete-of-empty="removeLastPetaTag()"
          ref="searchInput" />
      </e-tag>
    </e-search-box>
  </e-search-root>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

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
  if (value !== "") {
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
e-search-root {
  display: block;
  text-align: center;
  width: 100%;
  > e-search-box {
    border-radius: var(--rounded);
    border: solid var(--px-border) var(--color-border);
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
    > e-tag {
      display: inline-block;
      margin: 0px 0px var(--px-1) var(--px-1);
      border-radius: var(--rounded);
      padding: var(--px-1);
      background-color: var(--color-1);
      box-shadow: var(--shadow-small);
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
