<template>
  <t-tags-root>
    <t-tags-top>
      <VTagCell
        @click="selectPetaTag()"
        :selected="selectedAll"
        :readonly="true"
        :look="`${t('browser.all')}(${petaImagesArray.length})`"
      />
    </t-tags-top>
    <t-tags ref="tagsRoot">
      <VTagCell
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :selected="
          c.selected ||
          (draggingData !== undefined &&
            'petaTag' in draggingData &&
            draggingData.petaTag === c.petaTag)
        "
        @pointerdown.left="sortHelper.pointerdown($event, { petaTag: c.petaTag, id: c.petaTag.id })"
        :readonly="c.readonly"
        :value="c.petaTag.name"
        :look="`${c.petaTag.name}`"
        :ref="(element) => setVTagCellRef(element as any as VTagCellInstance, c.petaTag.id)"
        @update:value="(name) => changeTag(c.petaTag, name)"
        @contextmenu="tagMenu($event, c)"
        :style="{
          order: orders[c.petaTag.id] ?? browserTags.length,
        }"
      />
      <VTagPartition
        v-for="p in partitions"
        :value="p.name"
        :selected="false"
        :readonly="false"
        @pointerdown.left="sortHelper.pointerdown($event, { petaTagPartition: p, id: p.id })"
        @update:value="(name) => changePartition(p, name)"
        @contextmenu="partitionMenu($event, p)"
        :ref="(element) => setVPartitionRef(element as any as VTagPartitionInstance, p.id)"
        :key="p.id"
        :style="{
          order: orders[p.id] ?? browserTags.length,
        }"
      />
      <t-drag-target-linea
        class="t-drag-target-line"
        ref="dragTargetLineElement"
        v-if="draggingData"
      ></t-drag-target-linea>
    </t-tags>
    <t-drag-floating-tag-cell v-if="draggingData !== undefined" ref="floatingCellElement">
      <VTagCell
        v-if="'petaTag' in draggingData"
        :key="draggingData.petaTag.id"
        :selected="true"
        :readonly="true"
        :value="draggingData.petaTag.name"
        :look="`${draggingData.petaTag.name}`"
      />
      <VTagPartition
        v-if="'petaTagPartition' in draggingData"
        :key="draggingData.petaTagPartition.id"
        :selected="true"
        :readonly="true"
        :value="draggingData.petaTagPartition.name"
        :look="`${draggingData.petaTagPartition.name}`"
      />
    </t-drag-floating-tag-cell>
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
import { computed, onBeforeUpdate, onUnmounted, ref, watch } from "vue";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaTag } from "@/commons/datas/petaTag";
import { createPetaTagPartition, PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { BrowserTag } from "@/renderer/components/browser/browserTag";
import { UpdateMode } from "@/commons/datas/updateMode";
import { Keyboards } from "@/renderer/utils/keyboards";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { UNTAGGED_ID } from "@/commons/defines";
import { useTextsStore } from "@/renderer/stores/textsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/renderer/stores/componentsStore";
import VTextarea from "@/renderer/components/utils/VTextarea.vue";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore";
import { usePetaTagPartitionsStore } from "@/renderer/stores/petaTagPartitionsStore";
import VTagCell from "@/renderer/components/browser/tags/VTagCell.vue";
import VTagPartition from "@/renderer/components/browser/tags/VTagPartition.vue";
import {
  initSortHelper,
  SortHelperConstraint,
} from "@/renderer/components/browser/tags/sortHelper";
type VTagCellInstance = InstanceType<typeof VTagCell>;
type VTagPartitionInstance = InstanceType<typeof VTagPartition>;
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
const petaTagPartitionsStore = usePetaTagPartitionsStore();
const { t } = useI18n();
const vCells = ref<{ [key: string]: VTagCellInstance }>({});
const vPartitions = ref<{ [key: string]: VTagPartitionInstance }>({});
const tagsRoot = ref<HTMLElement>();
onUnmounted(() => {
  sortHelper.destroy();
});
onBeforeUpdate(() => {
  vCells.value = {};
  vPartitions.value = {};
});
function setVTagCellRef(element: VTagCellInstance, id: string) {
  vCells.value[id] = element;
}
function setVPartitionRef(element: VTagPartitionInstance, id: string) {
  vPartitions.value[id] = element;
}
//--------------------------------------------------------------------//
// ドラッグここから
//--------------------------------------------------------------------//
type MergedSortHelperData =
  | { petaTag: PetaTag; id: string }
  | { petaTagPartition: PetaTagPartition; id: string };
const draggingData = ref<MergedSortHelperData>();
const floatingCellElement = ref<HTMLElement>();
const orders = ref<{ [key: string]: number }>({});
const constraints = ref<{
  [key: string]: SortHelperConstraint;
}>({});
const sortHelper = initSortHelper<MergedSortHelperData>(
  {
    getElementFromId: (id) => (vCells.value[id]?.$el ?? vPartitions.value[id]?.$el) as HTMLElement,
    onChangeDraggingData: (data) => (draggingData.value = data),
    getIsDraggableFromId: (id) =>
      vCells.value[id]?.isEditing() === true || vPartitions.value[id]?.isEditing() === true
        ? false
        : true,
    onSort: () => {
      petaTagsStore.updatePetaTags(
        Object.values(petaTagsStore.state.petaTags.value).map((petaTag) => ({
          type: "petaTag",
          petaTag: {
            ...petaTag,
            index: orders.value[petaTag.id] ?? 0,
          },
        })),
        UpdateMode.UPDATE,
      );
      petaTagPartitionsStore.updatePetaTagPartitions(
        Object.values(petaTagPartitionsStore.state.petaTagPartitions.value).map(
          (petaTagPartition) => ({
            ...petaTagPartition,
            index: orders.value[petaTagPartition.id] ?? 0,
          }),
        ),
        UpdateMode.UPDATE,
      );
    },
    onClick: (_event, data) => {
      if ("petaTag" in data) {
        selectPetaTag(data.petaTag);
      }
    },
  },
  {
    orders,
    constraints,
    floatingCellElement,
  },
  {
    flexGap: 2,
  },
);
//--------------------------------------------------------------------//
// ドラッグここまで
//--------------------------------------------------------------------//
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
      {
        label: t("browser.addTagPartition"),
        click: () => {
          addPartition("test", tag.petaTag.index + 1);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
function partitionMenu(event: PointerEvent | MouseEvent, tag: PetaTagPartition) {
  components.contextMenu.open(
    [
      {
        label: t("browser.tagPartitionMenu.remove", [tag.name]),
        click: () => {
          removeTagPartition(tag);
        },
      },
      {
        label: t("browser.addTagPartition"),
        click: () => {
          addPartition("test", tag.index + 1);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
async function addTag(name: string) {
  await petaTagsStore.updatePetaTags([{ type: "name", name }], UpdateMode.INSERT);
}
async function addPartition(name: string, index: number) {
  const partition = createPetaTagPartition(name);
  partition.index = index;
  await petaTagPartitionsStore.updatePetaTagPartitions([partition], UpdateMode.INSERT);
}
async function removeTag(petaTag: PetaTag) {
  if (
    (await components.dialog.show(t("browser.removeTagDialog", [petaTag.name]), [
      t("commons.yes"),
      t("commons.no"),
    ])) === 0
  ) {
    await petaTagsStore.updatePetaTags([{ type: "id", id: petaTag.id }], UpdateMode.REMOVE);
    const index = props.selectedPetaTagIds.findIndex((pt) => pt === petaTag.id);
    if (index >= 0) {
      // props.selectedPetaTags.splice(index, 1);
      const newData = [...props.selectedPetaTagIds];
      newData.splice(index, 1);
      emit("update:selectedPetaTagIds", newData);
    }
  }
}
async function removeTagPartition(petaTag: PetaTagPartition) {
  if (
    (await components.dialog.show(t("browser.removeTagPartitionDialog", [petaTag.name]), [
      t("commons.yes"),
      t("commons.no"),
    ])) === 0
  ) {
    await petaTagPartitionsStore.updatePetaTagPartitions([petaTag], UpdateMode.REMOVE);
  }
}
async function changeTag(petaTag: PetaTag, newName: string) {
  if (petaTag.name === newName) {
    return;
  }
  if (browserTags.value.find((c) => c.petaTag.name === newName)) {
    components.dialog.show(t("browser.tagAlreadyExistsDialog", [newName]), [t("commons.yes")]);
    return;
  }
  petaTag.name = newName;
  await petaTagsStore.updatePetaTags([{ type: "petaTag", petaTag }], UpdateMode.UPDATE);
  selectPetaTag(petaTag);
}
async function changePartition(petaTag: PetaTagPartition, newName: string) {
  if (petaTag.name === newName) {
    return;
  }
  petaTag.name = newName;
  await petaTagPartitionsStore.updatePetaTagPartitions([petaTag], UpdateMode.UPDATE);
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
const partitions = computed(() => {
  return petaTagPartitionsStore.state.petaTagPartitions.value;
});
watch(
  [petaTagsStore.state.petaTags, petaTagPartitionsStore.state.petaTagPartitions],
  () => {
    orders.value = {};
    constraints.value = {};
    petaTagsStore.state.petaTags.value.forEach((petaTag) => {
      orders.value[petaTag.id] = petaTag.index;
      constraints.value[petaTag.id] = {
        insertToX: true,
        insertToY: false,
        moveX: true,
        moveY: true,
      };
    });
    petaTagPartitionsStore.state.petaTagPartitions.value.forEach((petaTagPartition) => {
      orders.value[petaTagPartition.id] = petaTagPartition.index;
      constraints.value[petaTagPartition.id] = {
        insertToX: false,
        insertToY: true,
        moveX: true,
        moveY: true,
      };
    });
  },
  { immediate: true },
);
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
    padding: var(--px-1) var(--px-1) 0px 0px;
    > t-tag {
      padding: var(--px-1);
    }
  }
  > t-tags-top {
    outline: none;
    padding: var(--px-1) var(--px-1) 0px 0px;
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
  }
  > t-tags {
    outline: none;
    padding: var(--px-1) var(--px-1) 0px 0px;
    width: 100%;
    text-align: left;
    overflow-y: scroll;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
  }
  > t-drag-target-line {
    position: fixed;
    z-index: 999;
    width: 0px;
    height: 0px;
    top: 0px;
    left: 0px;
    transform-origin: top left;
    &::after {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 99px;
      background-color: var(--color-accent-2);
      transform: translate(-50%, -50%);
    }
  }
  > t-drag-floating-tag-cell {
    z-index: 999;
    pointer-events: none;
    top: 0px;
    left: 0px;
    position: fixed;
    visibility: hidden;
    opacity: 0.9;
    transform-origin: top right;
  }
}
</style>
