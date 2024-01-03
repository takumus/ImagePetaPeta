<template>
  <e-tags-root>
    <e-tags-top>
      <VTagCell
        @click="changeFilterType(FilterType.ALL)"
        :selected="selectedFilterType === FilterType.ALL"
        :readonly="true"
        :look="`${t('browser.all')}(${petaFilesArray.length})`" />
      <VTagCell
        @click="changeFilterType(FilterType.UNTAGGED)"
        :selected="selectedFilterType === FilterType.UNTAGGED"
        :readonly="true"
        :look="`${t('browser.untagged')}`" />
    </e-tags-top>
    <e-tags ref="tagsRoot">
      <VTagCell
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :selected="
          (c.selected && selectedFilterType === FilterType.TAGS) ||
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
          order: orders[c.petaTag.id] ?? 0,
        }" />
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
          order: orders[p.id] ?? 0,
        }" />
    </e-tags>
    <e-drag-floating-tag-cell v-if="draggingData !== undefined" ref="floatingCellElement">
      <VTagCell
        v-if="'petaTag' in draggingData"
        :key="draggingData.petaTag.id"
        :selected="true"
        :readonly="true"
        :value="draggingData.petaTag.name"
        :look="`${draggingData.petaTag.name}`" />
      <VTagPartition
        v-if="'petaTagPartition' in draggingData"
        :key="draggingData.petaTagPartition.id"
        :selected="true"
        :readonly="true"
        :value="draggingData.petaTagPartition.name"
        :look="`${draggingData.petaTagPartition.name}`" />
    </e-drag-floating-tag-cell>
    <e-tag-add>
      <e-tag>
        <VTextarea
          :type="'single'"
          :trim="true"
          :click-to-edit="true"
          :text-area-style="{ width: '100%' }"
          :outer-style="{ width: '100%' }"
          :look="textsStore.state.value.plus"
          @update:value="addTag" />
      </e-tag>
    </e-tag-add>
  </e-tags-root>
</template>

<script setup lang="ts">
import { computed, onBeforeUpdate, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTagCell from "@/renderer/components/browser/tags/VTagCell.vue";
import VTagPartition from "@/renderer/components/browser/tags/VTagPartition.vue";
import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

import { createPetaTagPartition, PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import { UpdateMode } from "@/commons/datas/updateMode";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";

import { BrowserTag } from "@/renderer/components/browser/browserTag";
import { FilterType } from "@/renderer/components/browser/filterType";
import {
  initSortHelper,
  SortHelperConstraint,
} from "@/renderer/components/browser/tags/sortHelper";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { usePetaTagPartitionsStore } from "@/renderer/stores/petaTagPartitionsStore/usePetaTagPartitionsStore";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

type VTagCellInstance = InstanceType<typeof VTagCell>;
type VTagPartitionInstance = InstanceType<typeof VTagPartition>;
const emit = defineEmits<{
  (e: "update:selectedPetaTagIds", selectedPetaTagIds: string[]): void;
  (e: "update:selectedFilterType", selectedFilterType: FilterType): void;
}>();
const props = defineProps<{
  petaFilesArray: RPetaFile[];
  selectedPetaTagIds: string[];
  selectedFilterType: FilterType;
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
  | { petaTag: RPetaTag; id: string }
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
          addPartition("test", tag.petaTag.index);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
function partitionMenu(event: PointerEvent | MouseEvent, ptp: PetaTagPartition) {
  components.contextMenu.open(
    [
      {
        label: t("browser.tagPartitionMenu.remove", [ptp.name]),
        click: () => {
          removeTagPartition(ptp);
        },
      },
      {
        label: t("browser.addTagPartition"),
        click: () => {
          addPartition("test", ptp.index);
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
async function removeTag(petaTag: RPetaTag) {
  if (
    (await IPC.main.openModal(t("browser.removeTagDialog", [petaTag.name]), [
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
    (await IPC.main.openModal(t("browser.removeTagPartitionDialog", [petaTag.name]), [
      t("commons.yes"),
      t("commons.no"),
    ])) === 0
  ) {
    await petaTagPartitionsStore.updatePetaTagPartitions([petaTag], UpdateMode.REMOVE);
  }
}
async function changeTag(petaTag: RPetaTag, newName: string) {
  if (petaTag.name === newName) {
    return;
  }
  if (browserTags.value.find((c) => c.petaTag.name === newName)) {
    await IPC.main.openModal(t("browser.tagAlreadyExistsDialog", [newName]), [t("commons.yes")]);
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
}
function changeFilterType(filterType: FilterType) {
  emit("update:selectedFilterType", filterType);
}
function selectPetaTag(petaTag?: RPetaTag) {
  changeFilterType(FilterType.TAGS);
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
    return {
      petaTag: petaTag,
      count: 0,
      selected: props.selectedPetaTagIds.find((id) => id === petaTag.id) !== undefined,
      readonly: false,
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
</script>

<style lang="scss" scoped>
e-tags-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  > e-tag-add {
    padding: var(--px-1) var(--px-1) 0px 0px;
    > e-tag {
      padding: var(--px-1);
    }
  }
  > e-tags-top {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
    outline: none;
    padding: var(--px-1);
    width: 100%;
    text-align: left;
  }
  > e-tags {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
    outline: none;
    // padding: var(--px-1);
    width: 100%;
    overflow-y: auto;
    text-align: left;
  }
  > e-drag-floating-tag-cell {
    position: fixed;
    top: 0px;
    left: 0px;
    transform-origin: top right;
    visibility: hidden;
    opacity: 0.9;
    z-index: 999;
    pointer-events: none;
  }
}
</style>
