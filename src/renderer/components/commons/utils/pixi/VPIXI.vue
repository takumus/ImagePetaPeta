<template>
  <e-pixi-root ref="canvasWrapper"> </e-pixi-root>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted, ref } from "vue";

import { PIXIRect } from "@/renderer/components/commons/utils/pixi/rect";
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
  (e: "resize", rect: PIXIRect): void;
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
  if (resolution !== window.devicePixelRatio) {
    resolution = window.devicePixelRatio;
    destruct();
    construct(resolution);
  }
}
async function construct(resolution: number) {
  // PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.OFF;
  app = new PIXI.Application();
  await app.init({
    resolution,
    antialias: props.antialias,
    backgroundAlpha: 0,
  });
  app.ticker.stop();
  canvas = app.canvas;
  canvasWrapper.value?.appendChild(canvas);
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
  emit("resize", {
    domRect: rect,
    pixiRect: {
      width: app.renderer.view.canvas.width,
      height: app.renderer.view.canvas.height,
    },
  });
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
e-pixi-root {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
