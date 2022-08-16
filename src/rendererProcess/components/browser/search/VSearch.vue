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
import { defineProps, defineEmits, watch } from "vue";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UNTAGGED_ID } from "@/commons/defines";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import { ref } from "@vue/reactivity";
import { computed, getCurrentInstance, nextTick } from "@vue/runtime-core";

const plugins = getCurrentInstance()?.proxy;
const searchInput = ref<VEditableLabel>();

const props = defineProps<{
  petaTagInfos: PetaTagInfo[];
  selectedPetaTags: PetaTag[];
}>();

const emit = defineEmits<{
  (e: "update:petaTagInfos", value: PetaTagInfo[]): void;
  (e: "update:selectedPetaTags", value: PetaTag[]): void;
}>();

const _spliceSelectedPetaTags = (
  startIndex: number,
  count = Infinity
): { targetValues: PetaTag[]; otherValues: PetaTag[] } => {
  const [otherValues, targetValues] = props.selectedPetaTags.reduce(
    (result, value, index) => {
      if (index >= startIndex && index < startIndex + count) {
        return [[...result[0], value], result[1]];
      }
      return [result[0], [...result[1], value]];
    },
    [[], []] as [PetaTag[], PetaTag[]]
  );
  return {
    targetValues: targetValues,
    otherValues: otherValues,
  };
};

const editSearchTag = (tag: PetaTag, value: string) => {
  value = value.trim().replace(/\r?\n/g, "");
  const index = props.selectedPetaTags.findIndex((petaTag) => petaTag === tag);
  const splicedSelectedPetaTags = _spliceSelectedPetaTags(index, 1);
  emit("update:selectedPetaTags", splicedSelectedPetaTags.otherValues);
  if (value != "") {
    const petaTag = props.petaTagInfos.find(
      (pti) => pti.petaTag.name === value
    )?.petaTag;
    if (petaTag && !splicedSelectedPetaTags.otherValues.includes(petaTag)) {
      emit(
        "update:selectedPetaTags",
        splicedSelectedPetaTags.otherValues.splice(index, 0, petaTag)
      );
    }
  }
};

const removeLastPetaTag = () => {
  const last = props.selectedPetaTags[props.selectedPetaTags.length - 1];
  if (last) {
    editSearchTag(last, "");
  } else {
    // blur();
  }
};

const addSelectedTag = (tagName: string) => {
  const petaTag = props.petaTagInfos.find(
    (pti) => pti.petaTag.name === tagName
  )?.petaTag;
  const untaggedId = props.selectedPetaTags.findIndex(
    (petaTag) => petaTag.id === UNTAGGED_ID
  );

  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    emit("update:petaTagInfos", []);
  }

  if (petaTag && !props.selectedPetaTags.includes(petaTag)) {
    emit("update:selectedPetaTags", [petaTag]);
  }

  nextTick(() => {
    searchInput.value?.edit();
  });
};

const complementItems = computed(() => {
  return props.petaTagInfos
    .filter((pti) => {
      return !props.selectedPetaTags.includes(pti.petaTag);
    })
    .map((pti) => {
      return pti.petaTag.name;
    });
});

const complementTag = (editableLabel: VEditableLabel) => {
  plugins?.$components.complement.open(editableLabel, complementItems.value);
};

watch(
  () => complementItems.value,
  () => {
    plugins?.$components.complement.updateItems(complementItems.value);
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