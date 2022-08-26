<template>
  <t-tags-root>
    <t-tags>
      <t-tag @click="selectPetaTag()" :class="{ selected: selectedAll }">
        <VTextarea
          :type="'single'"
          :readonly="true"
          :trim="true"
          :value="`${t('browser.all')}(${petaImagesArray.length})`"
        />
      </t-tag>
      <t-tag
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :class="{ selected: c.selected }"
        @click="selectPetaTag(c.petaTag)"
      >
        <VTextarea
          :type="'single'"
          :trim="true"
          :readonly="c.readonly"
          :value="c.petaTag.name"
          :look="`${c.petaTag.name}(${c.count})`"
          @update:value="(name) => changeTag(c.petaTag, name)"
          @contextmenu="tagMenu($event, c)"
        />
      </t-tag>
    </t-tags>
    <t-tag-add>
      <t-tag>
        <VTextarea
          :type="'single'"
          :trim="true"
          :clickToEdit="true"
          :textAreaStyle="{ width: '100%' }"
          :outerStyle="{ width: '100%' }"
          :look="textsStore.state.value.plus"
          @update:value="addTag"
        />
      </t-tag>
    </t-tag-add>
  </t-tags-root>
</template>

<script setup lang="ts">
// Vue
import { computed } from "vue";
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
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";
const emit = defineEmits<{
  (e: "update:selectedPetaTags", selectedPetaTags: PetaTag[]): void;
}>();
const props = defineProps<{
  petaImagesArray: PetaImage[];
  petaTagInfos: PetaTagInfo[];
  selectedPetaTags: PetaTag[];
}>();
const textsStore = useTextsStore();
const components = useComponentsStore();
const { t } = useI18n();
function tagMenu(event: PointerEvent | MouseEvent, tag: BrowserTag) {
  if (tag.readonly) {
    return;
  }
  components.contextMenu.open(
    [
      {
        label: t("browser.tagMenu.remove", [tag.petaTag.name]),
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
    (await components.dialog.show(t("browser.removeTagDialog", [petaTag.name]), [
      t("shared.yes"),
      t("shared.no"),
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
    components.dialog.show(t("browser.tagAlreadyExistsDialog", [newName]), [t("shared.yes")]);
    return;
  }
  petaTag.name = newName;
  await API.send("updatePetaTags", [petaTag], UpdateMode.UPDATE);
  selectPetaTag(petaTag);
}
function selectPetaTag(petaTag?: PetaTag) {
  const newData = [...props.selectedPetaTags];
  let single = false;
  if (
    !Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    )
  ) {
    newData.length = 0;
    single = true;
  }
  const untaggedId = props.selectedPetaTags.findIndex((petaTag) => petaTag.id === UNTAGGED_ID);
  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    newData.length = 0;
  }
  if (petaTag) {
    if (!single) {
      if (!props.selectedPetaTags.includes(petaTag)) {
        newData.push(petaTag);
      }
    } else {
      newData.push(petaTag);
    }
  }
  emit("update:selectedPetaTags", newData);
}
const browserTags = computed((): BrowserTag[] => {
  const browserTags = props.petaTagInfos.map((petaTagInfo): BrowserTag => {
    return {
      petaTag: petaTagInfo.petaTag,
      count: petaTagInfo.count,
      selected:
        props.selectedPetaTags.find((spt) => spt.id === petaTagInfo.petaTag.id) !== undefined,
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
