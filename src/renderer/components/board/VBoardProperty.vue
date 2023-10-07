<template>
  <e-board-property-root>
    <button tabindex="-1" @click="scale = 1">{{ scale.toFixed(2) }}x</button>
    <input type="color" v-model="fillColor" tabindex="-1" ref="inputFillColor" />
    <input type="color" v-model="lineColor" tabindex="-1" ref="inputLineColor" />
  </e-board-property-root>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { RPetaBoard } from "@/commons/datas/rPetaBoard";

const props = defineProps<{
  board: RPetaBoard;
}>();
const emit = defineEmits<{
  (e: "update", board: RPetaBoard): void;
}>();
const inputFillColor = ref<HTMLInputElement>();
const inputLineColor = ref<HTMLInputElement>();
const fillColor = computed({
  get() {
    return props.board.background.fillColor;
  },
  set(value) {
    emit("update", {
      ...props.board,
      background: {
        ...props.board.background,
        fillColor: value,
      },
    });
  },
});
const lineColor = computed({
  get() {
    return props.board.background.lineColor;
  },
  set(value) {
    emit("update", {
      ...props.board,
      background: {
        ...props.board.background,
        lineColor: value,
      },
    });
  },
});
const scale = computed({
  get() {
    return props.board.transform.scale;
  },
  set(value) {
    emit("update", {
      ...props.board,
      transform: {
        ...props.board.transform,
        scale: value,
      },
    });
  },
});
</script>

<style lang="scss" scoped>
e-board-property-root {
  display: flex;
  position: absolute;
  top: 0px;
  left: 0px;
  justify-content: center;
  align-items: center;
  padding: var(--px-1);
  width: 100%;
  height: 100%;
  > button {
    padding: 0px;
    min-width: 24px;
    min-width: 50px;
    height: 100%;
    &.color {
      border-radius: var(--rounded);
      aspect-ratio: 1;
      width: auto;
      min-width: 0px;
    }
  }
  > * {
    margin: 0px;
    margin-right: var(--px-1);
  }
}
</style>
