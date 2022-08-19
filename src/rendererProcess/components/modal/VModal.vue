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
        <t-button @click="close" v-html="$texts.close"></t-button>
      </t-buttons>
      <t-content>
        <slot></slot>
      </t-content>
    </t-modal>
  </t-modal-root>
</template>

<script setup lang="ts">
// Vue
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from "vue";
// Others
import { v4 as uuid } from "uuid";
import { Keyboards } from "@/rendererProcess/utils/keyboards";

const props = defineProps<{
  visible?: boolean;
  parentStyle?: any;
  childStyle?: any;
  center?: boolean;
  visibleCloseButton?: boolean;
  ignore?: boolean;
  defaultZIndex?: number;
}>();
const emit = defineEmits<{
  (e: "state", visible: boolean): void;
  (e: "close"): void;
}>();
const _this = getCurrentInstance()!.proxy!;
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
const keyboards = new Keyboards();
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
  keyboards.destroy();
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
  return modalId === _this.$components.modal.modalIds[_this.$components.modal.modalIds.length - 1];
});
watch(
  () => _this.$components.modal.modalIds,
  () => {
    noBackground.value = !isActive.value;
  },
);
function changeModal() {
  noBackground.value = !isActive.value;
}
watch(
  () => props.visible,
  () => {
    if (props.ignore) {
      return;
    }
    // 自分のidを除外
    _this.$components.modal.modalIds = _this.$components.modal.modalIds.filter((id) => id != modalId);
    if (props.visible) {
      // 自分のidを追加
      _this.$components.modal.modalIds.push(modalId);
      zIndex.value = _this.$components.modal.currentModalZIndex + 3;
      _this.$components.modal.currentModalZIndex++;
    }
  },
);
watch(
  () => isActive,
  () => {
    emit("state", isActive.value);
  },
);
function pressEscape(pressed: boolean) {
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
    padding: 16px;
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    > t-buttons {
      text-align: right;
      display: block;
      > t-button {
        font-family: Segoe MDL2 Assets, "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo,
          sans-serif;
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
