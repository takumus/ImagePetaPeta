<template>
  <t-modal-root
    :class="{
      'no-background': noBackground,
    }"
    v-show="visible"
    :style="{
      ...(parentStyle ? parentStyle : {}),
      zIndex: zIndex,
    }"
    ref="background"
  >
    <t-modal
      :style="
        childStyle
          ? {
              ...childStyle,
              ...(center ? centerStyle : {}),
            }
          : center
          ? centerStyle
          : {}
      "
    >
      <t-buttons v-if="visibleCloseButton">
        <t-button @click="close" v-html="textsStore.state.value.close"></t-button>
      </t-buttons>
      <t-content>
        <slot></slot>
      </t-content>
    </t-modal>
  </t-modal-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
// Others
import { v4 as uuid } from "uuid";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";

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
    components.modal.modalIds = components.modal.modalIds.filter((id) => id != modalId);
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
t-modal-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--color-modal);
  color: var(--color-font);
  overflow: hidden;
  display: block;
  &.no-background {
    background-color: transparent;
  }
  > t-modal {
    width: 600px;
    background-color: var(--color-main);
    padding: var(--px2);
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    > t-buttons {
      text-align: right;
      display: block;
      > t-button {
        font-family: Segoe MDL2 Assets, "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN",
          "Hiragino Sans", Meiryo, sans-serif;
        cursor: pointer;
      }
    }
    > t-content {
      flex: 1;
      overflow: hidden;
      display: block;
    }
  }
}
</style>
