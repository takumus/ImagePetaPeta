<template>
  <e-modal-root
    :class="{
      'no-background': noBackground,
    }"
    v-show="visible"
    :style="{
      ...(parentStyle ? parentStyle : {}),
      zIndex: zIndex,
    }"
    ref="background">
    <e-modal
      :style="
        childStyle
          ? {
              ...childStyle,
              ...(center ? centerStyle : {}),
            }
          : center
          ? centerStyle
          : {}
      ">
      <e-buttons v-if="visibleCloseButton">
        <e-button @click="close" v-html="textsStore.state.value.close"></e-button>
      </e-buttons>
      <e-content>
        <slot></slot>
      </e-content>
    </e-modal>
  </e-modal-root>
</template>

<script setup lang="ts">
import { v4 as uuid } from "uuid";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

const props = defineProps<{
  visible?: boolean;
  parentStyle?: CSSStyleDeclaration;
  childStyle?: CSSStyleDeclaration;
  center?: boolean;
  visibleCloseButton?: boolean;
  ignore?: boolean;
  defaultZIndex?: number;
}>();
const emit = defineEmits<{
  (e: "state", visible: boolean): void;
  (e: "close"): void;
}>();
const textsStore = useTextsStore();
const components = useComponentsStore();
const zIndex = ref(0);
const noBackground = ref(false);
const background = ref<HTMLElement>();
const centerStyle = ref({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
});
const modalId = uuid();
const clickBackground = ref(false);
const keyboards = useKeyboardsStore();
onMounted(() => {
  background.value?.addEventListener("pointerdown", pointerdown);
  background.value?.addEventListener("pointerup", pointerup);
  keyboards.enabled = true;
  keyboards.keys("Escape").down(pressEscape);
  zIndex.value = props.defaultZIndex || 0;
});
onUnmounted(() => {
  background.value?.removeEventListener("pointerdown", pointerdown);
  background.value?.removeEventListener("pointerup", pointerup);
});
function close() {
  emit("close");
}
function pointerdown(event: PointerEvent) {
  clickBackground.value = event.target === background.value;
}
function pointerup(event: PointerEvent) {
  if (event.target === background.value && clickBackground.value) {
    close();
    clickBackground.value = false;
  }
}
const isActive = computed(() => {
  return modalId === components.modal.modalIds[components.modal.modalIds.length - 1];
});
watch(
  () => components.modal.modalIds,
  () => {
    noBackground.value = !isActive.value;
  },
);
watch(
  () => props.visible,
  () => {
    if (props.ignore) {
      return;
    }
    // 自分のidを除外
    components.modal.modalIds = components.modal.modalIds.filter((id) => id !== modalId);
    if (props.visible) {
      // 自分のidを追加
      components.modal.modalIds.push(modalId);
      zIndex.value = components.modal.currentModalZIndex + 3;
      components.modal.currentModalZIndex++;
    }
  },
);
watch(
  () => isActive,
  () => {
    emit("state", isActive.value);
  },
);
function pressEscape() {
  if (isActive.value) {
    close();
  }
}
</script>

<style lang="scss" scoped>
e-modal-root {
  display: block;
  position: absolute;
  top: 0px;
  left: 0px;
  background-color: var(--color-overlay);
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--color-font);
  &.no-background {
    background-color: transparent;
  }
  > e-modal {
    display: flex;
    flex-direction: column;
    border-radius: var(--rounded);
    background-color: var(--color-0);
    padding: var(--px-3);
    width: 600px;
    overflow: hidden;
    > e-buttons {
      display: block;
      text-align: right;
      > e-button {
        cursor: pointer;
        font-family:
          Segoe MDL2 Assets,
          "Helvetica Neue",
          Arial,
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          Meiryo,
          sans-serif;
      }
    }
    > e-content {
      display: block;
      flex: 1;
      overflow: hidden;
    }
  }
}
</style>
