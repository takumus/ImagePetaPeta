<template>
  <e-gamut-map-root
    ><e-circle>
      <VPIXI
        ref="vPixi"
        :antialias="false"
        @construct="construct"
        @destruct="destruct"
        @tick="animate"
        @lose-context="loseContext"
        @resize="resize" />
    </e-circle>
    <VSlider :min="0" :max="100" :width="'50%'" v-model:value="amountFilterValue" />
  </e-gamut-map-root>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import VPIXI from "@/renderer/components/commons/utils/pixi/VPIXI.vue";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider.vue";

import { RPetaFile } from "@/commons/datas/rPetaFile";

import hsvCircleImage from "@/_public/images/utils/hsvCircle.png";
import { generateGamutMap } from "@/renderer/components/commons/property/worker/generateGamutMap";
import { generateGamutMapWorkerOutputData } from "@/renderer/components/commons/property/worker/generateGamutMapWorkerData";
import { PIXIRect } from "@/renderer/components/commons/utils/pixi/rect";
import { IPC } from "@/renderer/libs/ipc";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const props = defineProps<{
  petaFile: RPetaFile;
}>();
const vPixi = ref<InstanceType<typeof VPIXI>>();
const amountFilterValue = ref(100);
const size: PIXI.ISize = {
  width: 256,
  height: 256,
};
const dotSize = 1;
const radius = size.width / 2 - Math.sqrt(Math.pow(dotSize * 2 + 1, 2));
const resultRawPixels = new Uint8Array(
  Array.from(Array(size.width * size.height * 4)).map(() => 0x00),
);
const resultNormalizedPixels = new Uint8Array(
  Array.from(Array(size.width * size.height * 4)).map(() => 0x00),
);
const resultAlphas = Array.from(Array(size.width * size.height)).map(() => 0);
const backgroundRawSprite = new PIXI.Sprite();
const backgroundNormalizedSprite = new PIXI.Sprite();
const resultRawSprite = new PIXI.Sprite(
  new PIXI.Texture(new PIXI.BaseTexture(new PIXI.BufferResource(resultRawPixels, size))),
);
const resultNormalizedSprite = new PIXI.Sprite(
  new PIXI.Texture(new PIXI.BaseTexture(new PIXI.BufferResource(resultNormalizedPixels, size))),
);
const settings = useSettingsStore();
backgroundRawSprite.alpha = 0.3;
backgroundNormalizedSprite.alpha = 0.3;
PIXI.Texture.fromURL(hsvCircleImage).then((texture) => {
  backgroundRawSprite.texture = backgroundNormalizedSprite.texture = texture;
});
let generateGamutMapCancel = () => {
  //
};
onMounted(() => {
  //
});
onUnmounted(() => {
  generateGamutMapCancel();
  backgroundNormalizedSprite.destroy({ texture: true, baseTexture: true });
  backgroundRawSprite.destroy({ texture: true, baseTexture: true });
  resultNormalizedSprite.destroy({ texture: true, baseTexture: true });
  resultRawSprite.destroy({ texture: true, baseTexture: true });
  console.log("destroy");
});
function construct() {
  console.log("construct");
  const app = vPixi.value?.app();
  if (app) {
    app.stage.addChild(
      backgroundRawSprite,
      backgroundNormalizedSprite,
      resultRawSprite,
      resultNormalizedSprite,
    );
  }
}
function destruct() {
  //
}
function animate() {
  console.time("render");
  for (let i = 0; i < resultAlphas.length; i++) {
    resultRawPixels[i * 4 + 3] = resultNormalizedPixels[i * 4 + 3] = Math.min(
      (resultAlphas[i] ?? 1) * amountFilterValue0xff.value,
      0xff,
    );
  }
  resultRawSprite.texture.baseTexture.update();
  resultNormalizedSprite.texture.baseTexture.update();
  console.timeEnd("render");
}
function loseContext() {
  IPC.main.reloadWindow();
}
function resize(rect: PIXIRect) {
  backgroundRawSprite.width =
    backgroundNormalizedSprite.width =
    resultNormalizedSprite.width =
    resultRawSprite.width =
      rect.domRect.width / 2;
  backgroundRawSprite.height =
    backgroundNormalizedSprite.height =
    resultNormalizedSprite.height =
    resultRawSprite.height =
      rect.domRect.width / 2;
  backgroundNormalizedSprite.x = rect.domRect.width / 2;
  resultNormalizedSprite.x = rect.domRect.width / 2;
}
function setPixel(pixels: Uint8Array, x: number, y: number, r: number, g: number, b: number) {
  if (x < 0 || x > size.width || y < 0 || y > size.height) {
    return;
  }
  const index = Math.floor(y) * size.width * 4 + Math.floor(x) * 4;
  pixels[index] = r;
  pixels[index + 1] = g;
  pixels[index + 2] = b;
  pixels[index + 3] = 0xff;
}
function reset() {
  for (let i = 0; i < resultRawPixels.length; i++) {
    resultNormalizedPixels[i] = resultRawPixels[i] = 0x00;
  }
  for (let i = 0; i < resultAlphas.length; i++) {
    resultAlphas[i] = 0;
  }
}
function setData(data: generateGamutMapWorkerOutputData) {
  const x = Math.floor(data[2] * radius + size.width / 2);
  const y = Math.floor(data[3] * radius + size.height / 2);
  for (let xi = -dotSize; xi <= dotSize; xi++) {
    for (let yi = -dotSize; yi <= dotSize; yi++) {
      const px = x + xi;
      const py = y + yi;
      const aIndex = Math.floor(py) * size.width + Math.floor(px);
      resultAlphas[aIndex] += 1;
      if (px === x && py === y) {
        resultAlphas[aIndex] += 1;
      }
      setPixel(resultRawPixels, px, py, data[4], data[5], data[6]);
      setPixel(resultNormalizedPixels, px, py, data[7], data[8], data[9]);
    }
  }
  vPixi.value?.orderPIXIRender();
}
function generate() {
  generateGamutMapCancel();
  reset();
  const task = generateGamutMap(props.petaFile, settings.state.value.gamutMapSampling, setData);
  console.time("convert");
  task.promise.then(() => {
    console.timeEnd("convert");
    // generate(); ストレステスト
  });
  generateGamutMapCancel = task.cancel;
}
const amountFilterValue0xff = computed(() => Math.pow(amountFilterValue.value / 100, 5) * 0xff);
watch(amountFilterValue, () => {
  vPixi.value?.orderPIXIRender();
});
watch(() => props.petaFile, generate, { immediate: true });
</script>
<style lang="scss" scoped>
e-gamut-map-root {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  > e-circle {
    display: block;
    aspect-ratio: 2/1;
    width: 100%;
    overflow: hidden;
  }
  > input {
    display: block;
    padding: var(--px-2);
  }
}
</style>
