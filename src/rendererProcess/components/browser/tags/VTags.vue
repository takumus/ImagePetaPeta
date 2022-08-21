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
          :labelLook="textsStore.state.value.plus + '       '"
          :clickToEdit="true"
          @change="(name) => addTag(name)"
          :growWidth="true"
          :noOutline="true"
        />
      </t-tag>
    </t-tag-add>
  </t-tags-root>
</template>

<script setup lang="ts">
// Vue
import { computed, getCurrentInstance } from "vue";

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
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
const _this = getCurrentInstance()!.proxy!;
const emit = defineEmits<{
  (e: "update:selectedPetaTags", selectedPetaTags: PetaTag[]): void;
}>();
const props = defineProps<{
  petaImagesArray: PetaImage[];
  petaTagInfos: PetaTagInfo[];
  selectedPetaTags: PetaTag[];
}>();
const textsStore = useTextsStore();
function tagMenu(event: PointerEvent | MouseEvent, tag: BrowserTag) {
  if (tag.readonly) {
    return;
  }
  _this.$components.contextMenu.open(
    [
      {
        label: _this.$t("browser.tagMenu.remove", [tag.petaTag.name]),
        click: () => {
          removeTag(tag.petaTag);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
async function addTag(name: string) {
  if (props.petaTagInfos.find((pi) => pi.petaTag.name === name)) {
    return;
  }
  API.send("updatePetaTags", [createPetaTag(name)], UpdateMode.UPSERT);
}
async function removeTag(petaTag: PetaTag) {
  if (
    (await _this.$components.dialog.show(_this.$t("browser.removeTagDialog", [petaTag.name]), [
      _this.$t("shared.yes"),
      _this.$t("shared.no"),
    ])) === 0
  ) {
    await API.send("updatePetaTags", [petaTag], UpdateMode.REMOVE);
    const index = props.selectedPetaTags.findIndex((pt) => pt === petaTag);
    if (index >= 0) {
      // props.selectedPetaTags.splice(index, 1);
      const newData = [...props.selectedPetaTags];
      newData.splice(index, 1);
      emit("update:selectedPetaTags", newData);
    }
  }
}
async function changeTag(petaTag: PetaTag, newName: string) {
  if (petaTag.name === newName) {
    return;
  }
  if (browserTags.value.find((c) => c.petaTag.name === newName)) {
    _this.$components.dialog.show(_this.$t("browser.tagAlreadyExistsDialog", [newName]), [_this.$t("shared.yes")]);
    return;
  }
  petaTag.name = newName;
  await API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
  selectPetaTag(petaTag);
}
function selectPetaTag(petaTag?: PetaTag, single = false) {
  const newData = [...props.selectedPetaTags];
  if (
    !Keyboards.pressedOR("ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight") ||
    single
  ) {
    newData.length = 0;
  }
  const untaggedId = props.selectedPetaTags.findIndex((petaTag) => petaTag.id === UNTAGGED_ID);
  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    newData.length = 0;
  }
  if (petaTag && !props.selectedPetaTags.includes(petaTag)) {
    newData.push(petaTag);
  }
  emit("update:selectedPetaTags", newData);
}
const browserTags = computed((): BrowserTag[] => {
  const browserTags = props.petaTagInfos.map((petaTagInfo): BrowserTag => {
    return {
      petaTag: petaTagInfo.petaTag,
      count: petaTagInfo.count,
      selected: props.selectedPetaTags.find((spt) => spt.id === petaTagInfo.petaTag.id) !== undefined,
      readonly: petaTagInfo.petaTag.id === UNTAGGED_ID,
    };
  });
  return browserTags;
});
const selectedAll = computed(() => {
  return props.selectedPetaTags.length === 0;
});
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
