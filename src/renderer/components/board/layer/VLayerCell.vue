<template>
  <li
    class="layer-cell-root"
    :class="{
      drag: false,
      selected: selected,
      sorting: sorting,
    }"
    @pointerdown="pointerdown($event)"
    ref="vLayerCellRoot">
    <t-icon
      class="visible"
      ref="visibleIcon"
      :class="{
        disabled: !visible,
      }">
    </t-icon>
    <t-icon
      class="lock"
      ref="lockedIcon"
      :class="{
        disabled: !locked,
      }">
    </t-icon>
    <t-thumb
      v-if="url"
      :style="{
        backgroundImage: `url(${url})`,
      }">
      <t-nsfw v-if="nsfwMask"></t-nsfw>
    </t-thumb>
  </li>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { FileType } from "@/commons/datas/fileType";
import { MouseButton } from "@/commons/datas/mouseButton";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";

import { ClickChecker } from "@/renderer/libs/clickChecker";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { getFileURL } from "@/renderer/utils/fileURL";

const emit = defineEmits<{
  (e: "startDrag", event: PointerEvent, petaPanel: RPetaPanel): void;
  (e: "update:petaPanel", cellData: RPetaPanel): void;
  (e: "onClick", event: PointerEvent, petaPanel: RPetaPanel): void;
}>();
const props = defineProps<{
  petaPanel?: RPetaPanel;
  selected?: boolean;
  sorting?: boolean;
}>();
const petaFilesStore = usePetaFilesStore();
const visibleIcon = ref<HTMLElement>();
const lockedIcon = ref<HTMLElement>();
const nsfwStore = useNSFWStore();
const click = new ClickChecker();
const vLayerCellRoot = ref<HTMLElement>();
onMounted(() => {
  //
});
onUnmounted(() => {
  //
});
const url = computed(() => {
  return props.petaPanel
    ? getFileURL(petaFilesStore.getPetaFile(props.petaPanel.petaFileId), FileType.THUMBNAIL)
    : undefined;
});
const locked = computed(() => {
  return props.petaPanel?.locked;
});
const visible = computed(() => {
  return props.petaPanel?.visible;
});
const nsfwMask = computed(() => {
  return petaFilesStore.getPetaFile(props.petaPanel?.petaFileId)?.nsfw && !nsfwStore.state.value;
});
function pointerdown(event: PointerEvent) {
  if (event.button === MouseButton.LEFT) {
    if (props.petaPanel && vLayerCellRoot.value) {
      emit("startDrag", { ...event, currentTarget: vLayerCellRoot.value }, props.petaPanel);
    }
  }
  click.down();
  click.on("click", (event) => {
    if (props.petaPanel === undefined) {
      return;
    }
    if (event.button === MouseButton.LEFT) {
      if (event.target === visibleIcon.value) {
        emit("update:petaPanel", {
          ...props.petaPanel,
          visible: !props.petaPanel.visible,
        });
      } else if (event.target === lockedIcon.value) {
        emit("update:petaPanel", {
          ...props.petaPanel,
          locked: !props.petaPanel.locked,
        });
      }
    }
    emit("onClick", event, props.petaPanel);
  });
}
</script>

<style lang="scss" scoped>
.layer-cell-root {
  cursor: pointer;
  margin: 0px;
  padding: var(--px-1);
  background-color: var(--color-0);
  display: flex;
  align-items: center;
  height: 64px;
  width: 100%;
  &.selected {
    background-color: var(--color-accent-1) !important;
  }
  &.drag,
  &:hover {
    background-color: var(--color-accent-1);
    &.sorting {
      background-color: var(--color-0);
    }
  }
  &.drag {
    position: absolute;
    top: 0px;
  }
  > t-icon {
    padding: 0px var(--px-2);
    height: 100%;
    width: 24px;
    background: no-repeat;
    background-position: center center;
    background-size: 12px;
    display: block;
    filter: var(--filter-icon);
    &.visible {
      background-size: 14px;
      background-image: url("~@/@assets/visible.png");
    }
    &.lock {
      background-size: 11px;
      background-image: url("~@/@assets/locked.png");
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  > t-thumb {
    min-width: 32px;
    height: 100%;
    margin: 0px var(--px-2);
    flex: 1;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
    display: block;
    > t-nsfw {
      width: 100%;
      height: 100%;
      display: block;
      background-size: 24px;
      background-position: center;
      background-repeat: repeat;
      background-image: url("~@/@assets/nsfwBackground.png");
    }
  }
  > .name {
    flex: 1;
    overflow: hidden;
    max-height: 100%;
    word-break: break-word;
  }
}
</style>
