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
          @deleteOfEmpty="editSearchTag(tag, '')"
        />
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
          @update:value="addSelectedTag"
          @deleteOfEmpty="removeLastPetaTag()"
          ref="searchInput"
        />
      </t-tag>
    </t-search-box>
  </t-search-root>
</template>

<script lang="ts" setup>
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UNTAGGED_ID } from "@/commons/defines";
import { ref } from "@vue/reactivity";
import { computed } from "@vue/runtime-core";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";

const searchInput = ref<InstanceType<typeof VTextarea>>();
const textsStore = useTextsStore();
const props = defineProps<{
  petaTagInfos: PetaTagInfo[];
  selectedPetaTagIds: string[];
}>();

const emit = defineEmits<{
  (e: "update:selectedPetaTagIds", value: string[]): void;
}>();

function editSearchTag(tag: PetaTag, value: string) {
  console.log("edit:", tag.name, "->", value);
  const index = props.selectedPetaTagIds.findIndex((id) => id === tag.id);
  const _selectedPetaTagIds = [...props.selectedPetaTagIds];
  _selectedPetaTagIds.splice(index, 1);
  if (value != "") {
    const petaTag = props.petaTagInfos.find((pti) => pti.petaTag.name === value)?.petaTag;
    if (petaTag && !_selectedPetaTagIds.includes(petaTag.id)) {
      _selectedPetaTagIds.splice(index, 0, petaTag.id);
    }
  }
  emit("update:selectedPetaTagIds", _selectedPetaTagIds);
}

function removeLastPetaTag() {
  const last = props.selectedPetaTagIds[props.selectedPetaTagIds.length - 1];
  if (last) {
    const petaTag = props.petaTagInfos.find((tag) => tag.petaTag.id === last)?.petaTag;
    if (petaTag !== undefined) {
      editSearchTag(petaTag, "");
    }
  } else {
    // blur();
  }
}

function addSelectedTag(tagName: string) {
  const petaTag = props.petaTagInfos.find((pti) => pti.petaTag.name === tagName)?.petaTag;
  const untaggedId = props.selectedPetaTagIds.findIndex((id) => id === UNTAGGED_ID);

  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    emit("update:selectedPetaTagIds", []);
  }

  if (petaTag && !props.selectedPetaTagIds.includes(petaTag.id)) {
    emit("update:selectedPetaTagIds", [...props.selectedPetaTagIds, petaTag.id]);
  }

  setTimeout(() => {
    searchInput.value?.edit();
  }, 100);
}

const complementItems = computed(() => {
  return props.petaTagInfos
    .filter((pti) => {
      return !props.selectedPetaTagIds.includes(pti.petaTag.id);
    })
    .map((pti) => {
      return pti.petaTag.name;
    });
});

const selectedPetaTags = computed(() => {
  return props.selectedPetaTagIds
    .map((id) => {
      return props.petaTagInfos.find((tag) => tag.petaTag.id === id)?.petaTag;
    })
    .filter((petaTag) => petaTag !== undefined) as PetaTag[];
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
    padding: 4px 4px 0px 0px;
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
      margin: 0px 0px 4px 4px;
      border-radius: var(--rounded);
      padding: 4px;
      background-color: var(--color-sub);
      // border: solid 1.2px var(--color-border);
      &.last {
        width: 100%;
        background-color: unset;
        flex: 1 1 64px;
      }
    }
  }
}
</style>
