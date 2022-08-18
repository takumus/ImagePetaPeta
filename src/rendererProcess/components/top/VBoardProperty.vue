<template>
  <t-board-property-root>
    <button tabindex="-1" @click="scale = 1">{{ Math.floor(scale * 100) }}%</button>
    <button
      class="color"
      tabindex="-1"
      :style="{
        backgroundColor: fillColor,
      }"
      @click="inputFillColor?.click()"
    >
      &nbsp;
    </button>
    <input type="color" v-model="fillColor" tabindex="-1" ref="inputFillColor" />
    <button
      class="color"
      tabindex="-1"
      :style="{
        backgroundColor: lineColor,
      }"
      @click="inputLineColor?.click()"
    >
      &nbsp;
    </button>
    <input type="color" v-model="lineColor" tabindex="-1" ref="inputLineColor" />
  </t-board-property-root>
</template>

<script setup lang="ts">
// Vue
import { computed, getCurrentInstance, onBeforeUpdate, onMounted, onUnmounted, reactive, ref, unref } from "vue";
// Others
import { PetaBoard } from "@/commons/datas/petaBoard";
const props = defineProps<{
  board: PetaBoard;
}>();
const emit = defineEmits<{
  (e: "update", board: PetaBoard): void;
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
t-board-property-root {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  padding: 4px;
  text-align: center;
  > input {
    display: inline-block;
    width: 0px;
    height: 0px;
    overflow: hidden;
    position: relative;
    margin: 0px;
    padding: 0px;
    border: none;
  }
  > button {
    min-width: 24px;
    padding: 0px;
    height: 100%;
    margin: 0px;
    min-width: 50px;
    margin-right: 4px;
    &.color {
      border-radius: 100px;
      width: auto;
      min-width: 0px;
      aspect-ratio: 1;
    }
  }
}
</style>
