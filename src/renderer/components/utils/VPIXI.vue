<template>
  <t-pixi-root ref="canvasWrapper"> </t-pixi-root>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted, ref } from "vue";

import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";

const canvasWrapper = ref<HTMLElement>();
const resizerStore = useResizerStore();
let app: PIXI.Application | undefined;
let canvas: HTMLCanvasElement | undefined;
let resolution = -1;
let requestAnimationFrameHandle = -1;
let changeResolutionIntervalHandler = -1;
let renderOrdered = false;
const emit = defineEmits<{
  (e: "loseContext"): void;
  (e: "render"): void;
  (e: "construct"): void;
  (e: "destruct"): void;
  (e: "tick"): void;
  (e: "resize", rect: DOMRect | DOMRectReadOnly): void;
}>();
const props = defineProps<{
  antialias?: boolean;
}>();
onMounted(() => {
  resizerStore.on("resize", resize);
  resizerStore.observe(canvasWrapper.value);
  constructIfResolutionChanged();
  changeResolutionIntervalHandler = window.setInterval(constructIfResolutionChanged, 500);
});
onUnmounted(() => {
  destruct();
  window.clearInterval(changeResolutionIntervalHandler);
});
function constructIfResolutionChanged() {
  if (resolution != window.devicePixelRatio) {
    resolution = window.devicePixelRatio;
    destruct();
    construct(resolution);
  }
}
function construct(resolution: number) {
  PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
  app = new PIXI.Application({
    resolution,
    antialias: props.antialias,
    backgroundAlpha: 0,
  });
  app.ticker.stop();
  canvas = app.view as HTMLCanvasElement;
  canvasWrapper.value?.appendChild(canvas as HTMLCanvasElement);
  canvas.addEventListener("webglcontextlost", () => {
    emit("loseContext");
  });
  emit("construct");
  resizerStore.forceEmit();
  renderPIXI();
}
function destruct() {
  if (app) {
    emit("destruct");
    app.destroy(true);
    app = undefined;
  }
  cancelAnimationFrame(requestAnimationFrameHandle);
}
function renderPIXI(force = false) {
  if (app === undefined) {
    throw new Error("app is not ready");
  }
  if (renderOrdered || force) {
    emit("tick");
    app.render();
    renderOrdered = false;
  }
  requestAnimationFrameHandle = requestAnimationFrame(() => renderPIXI());
}
function orderPIXIRender() {
  renderOrdered = true;
}
function resize(rect: DOMRect) {
  if (app === undefined || canvas === undefined) {
    return;
  }
  app.renderer.resize(rect.width, rect.height);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  emit("resize", rect);
  renderPIXI(true);
}
defineExpose({
  orderPIXIRender,
  forcePIXIRender: () => renderPIXI(true),
  app: () => {
    if (app === undefined) {
      throw new Error("app is not ready");
    }
    return app;
  },
  canvas: () => {
    if (canvas === undefined) {
      throw new Error("canvas is not ready");
    }
    return canvas;
  },
  canvasWrapper: () => {
    if (canvasWrapper.value === undefined) {
      throw new Error("canvasWrapper is not ready");
    }
    return canvasWrapper.value;
  },
});
</script>

<style lang="scss" scoped>
t-pixi-root {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
