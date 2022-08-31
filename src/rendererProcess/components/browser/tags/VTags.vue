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
import { UNTAGGED_ID } from "@/commons/defines";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";
import { usePetaTagsStore } from "@/rendererProcess/stores/petaTagsStore";
const emit = defineEmits<{
  (e: "update:selectedPetaTagIds", selectedPetaTagIds: string[]): void;
}>();
const props = defineProps<{
  petaImagesArray: PetaImage[];
  selectedPetaTagIds: string[];
}>();
const textsStore = useTextsStore();
const components = useComponentsStore();
const petaTagsStore = usePetaTagsStore();
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
  if (petaTagsStore.state.petaTags.value.find((pi) => pi.name === name)) {
    return;
  }
  API.send("updatePetaTags", [createPetaTag(name)], UpdateMode.INSERT);
}
async function removeTag(petaTag: PetaTag) {
  if (
    (await components.dialog.show(t("browser.removeTagDialog", [petaTag.name]), [
      t("shared.yes"),
      t("shared.no"),
    ])) === 0
  ) {
    await API.send("updatePetaTags", [petaTag], UpdateMode.REMOVE);
    const index = props.selectedPetaTagIds.findIndex((pt) => pt === petaTag.id);
    if (index >= 0) {
      // props.selectedPetaTags.splice(index, 1);
      const newData = [...props.selectedPetaTagIds];
      newData.splice(index, 1);
      emit("update:selectedPetaTagIds", newData);
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
  const newData = [...props.selectedPetaTagIds];
  const prevTags = props.selectedPetaTagIds.join(",");
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
  const untaggedId = props.selectedPetaTagIds.findIndex((id) => id === UNTAGGED_ID);
  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    newData.length = 0;
  }
  if (petaTag) {
    if (!single) {
      if (!props.selectedPetaTagIds.includes(petaTag.id)) {
        newData.push(petaTag.id);
      }
    } else {
      newData.push(petaTag.id);
    }
  }
  const newTags = newData.join(",");
  if (prevTags === newTags) {
    return;
  }
  emit("update:selectedPetaTagIds", newData);
}
const browserTags = computed((): BrowserTag[] => {
  const browserTags = petaTagsStore.state.petaTags.value.map((petaTag): BrowserTag => {
    const count = petaTagsStore.state.petaTagCounts.value[petaTag.id];
    return {
      petaTag: petaTag,
      count: count !== undefined ? count : -1,
      selected: props.selectedPetaTagIds.find((id) => id === petaTag.id) !== undefined,
      readonly: petaTag.id === UNTAGGED_ID,
    };
  });
  return browserTags;
});
const selectedAll = computed(() => {
  return props.selectedPetaTagIds.length === 0;
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
