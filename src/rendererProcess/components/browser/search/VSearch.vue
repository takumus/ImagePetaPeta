<template>
  <t-search-root>
    <t-search-box>
      <t-tag v-for="tag in selectedPetaTags" :key="tag.id">
        <VEditableLabel
          :label="tag.name"
          :labelLook="tag.name"
          :clickToEdit="true"
          :allowEmpty="true"
          @focus="complementTag"
          @change="(value) => editSearchTag(tag, value)"
          @delete="editSearchTag(tag, '')"
        />
      </t-tag>
      <t-tag class="last">
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
      </t-tag>
    </t-search-box>
  </t-search-root>
</template>

<script lang="ts" setup>
import { watch } from "vue";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UNTAGGED_ID } from "@/commons/defines";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import { ref } from "@vue/reactivity";
import { computed, getCurrentInstance, nextTick } from "@vue/runtime-core";

const _this = getCurrentInstance()!.proxy!;
const searchInput = ref<typeof VEditableLabel>();

const props = defineProps<{
  petaTagInfos: PetaTagInfo[];
  selectedPetaTags: PetaTag[];
}>();

const emit = defineEmits<{
  (e: "update:selectedPetaTags", value: PetaTag[]): void;
}>();

function editSearchTag(tag: PetaTag, value: string) {
  value = value.trim().replace(/\r?\n/g, "");
  const index = props.selectedPetaTags.findIndex((petaTag) => petaTag === tag);
  const _selectedPetaTags = [...props.selectedPetaTags];
  _selectedPetaTags.splice(index, 1);
  emit("update:selectedPetaTags", _selectedPetaTags);
  if (value != "") {
    const petaTag = props.petaTagInfos.find(
      (pti) => pti.petaTag.name === value
    )?.petaTag;
    if (petaTag && !_selectedPetaTags.includes(petaTag)) {
      emit(
        "update:selectedPetaTags",
        _selectedPetaTags.splice(index, 0, petaTag)
      );
    }
  }
}

function removeLastPetaTag() {
  const last = props.selectedPetaTags[props.selectedPetaTags.length - 1];
  if (last) {
    editSearchTag(last, "");
  } else {
    // blur();
  }
}

function addSelectedTag(tagName: string) {
  const petaTag = props.petaTagInfos.find(
    (pti) => pti.petaTag.name === tagName
  )?.petaTag;
  const untaggedId = props.selectedPetaTags.findIndex(
    (petaTag) => petaTag.id === UNTAGGED_ID
  );

  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    emit("update:selectedPetaTags", []);
  }

  if (petaTag && !props.selectedPetaTags.includes(petaTag)) {
    emit("update:selectedPetaTags", [...props.selectedPetaTags, petaTag]);
  }

  nextTick(() => {
    searchInput.value?.edit();
  });
}

function complementTag(editableLabel: any) {
  _this.$components.complement.open(editableLabel, complementItems.value);
}

const complementItems = computed(() => {
  return props.petaTagInfos
    .filter((pti) => {
      return !props.selectedPetaTags.includes(pti.petaTag);
    })
    .map((pti) => {
      return pti.petaTag.name;
    });
});

watch(
  () => complementItems.value,
  () => {
    _this.$components.complement.updateItems(complementItems.value);
  }
);
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