<template>
  <t-color-circle-root
    ><t-circle>
      <VPIXI
        ref="vPixi"
        :antialias="false"
        @construct="construct"
        @destruct="destruct"
        @tick="animate"
        @loseContext="loseContext"
        @resize="resize"
      />
    </t-circle>
    <input type="range" min="0" max="100" v-model="alphaOffset" />
  </t-color-circle-root>
</template>

<script setup lang="ts">
import { RPetaImage } from "@/commons/datas/rPetaImage";
import { generateColorCircle } from "@/renderer/components/browser/property/worker/generateColorCircle";
import { GenerateColorCircleWorkerOutputData } from "@/renderer/components/browser/property/worker/generateColorCircleWorkerData";
import VPIXI from "@/renderer/components/utils/VPIXI.vue";
import * as PIXI from "pixi.js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import hsvCircleImage from "@/@assets/hsvCircle.png";
import { BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";
import { IPC } from "@/renderer/ipc";
const props = defineProps<{
  petaImage: RPetaImage;
}>();
const pixelCount = BROWSER_THUMBNAIL_SIZE * BROWSER_THUMBNAIL_SIZE;
const vPixi = ref<InstanceType<typeof VPIXI>>();
const alphaOffset = ref(100);
const size: PIXI.ISize = {
  width: 256,
  height: 256,
};
const dotSize = 2;
const radius = size.width / 2 - Math.sqrt(dotSize * dotSize);
const resultRawPixels = new Uint8Array(
  Array.from(Array(size.width * size.height * 4)).map(() => 0x00),
);
const resultNormalizedPixels = new Uint8Array(
  Array.from(Array(size.width * size.height * 4)).map(() => 0x00),
);
const resultAlphas = new Uint8Array(Array.from(Array(size.width * size.height)).map(() => 0x00));
const backgroundRawSprite = new PIXI.Sprite();
const backgroundNormalizedSprite = new PIXI.Sprite();
const resultRawSprite = new PIXI.Sprite(
  new PIXI.Texture(new PIXI.BaseTexture(new PIXI.BufferResource(resultRawPixels, size))),
);
const resultNormalizedSprite = new PIXI.Sprite(
  new PIXI.Texture(new PIXI.BaseTexture(new PIXI.BufferResource(resultNormalizedPixels, size))),
);
backgroundRawSprite.alpha = 0.3;
backgroundNormalizedSprite.alpha = 0.3;
PIXI.Texture.fromURL(hsvCircleImage).then((texture) => {
  backgroundRawSprite.texture = backgroundNormalizedSprite.texture = texture;
});
let generateColorCircleCancel = () => {
  //
};
onMounted(() => {
  //
});
onUnmounted(() => {
  generateColorCircleCancel();
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
    resultRawPixels[i * 4 + 3] = Math.min((resultAlphas[i] ?? 0) * alphaOffset255.value, 0xff);
    resultNormalizedPixels[i * 4 + 3] = Math.min(
      (resultAlphas[i] ?? 0) * alphaOffset255.value,
      0xff,
    );
  }
  resultRawSprite.texture.baseTexture.update();
  resultNormalizedSprite.texture.baseTexture.update();
  console.timeEnd("render");
}
function loseContext() {
  IPC.send("reloadWindow");
}
function resize(r: DOMRect) {
  backgroundRawSprite.width =
    backgroundNormalizedSprite.width =
    resultNormalizedSprite.width =
    resultRawSprite.width =
      r.width / 2;
  backgroundRawSprite.height =
    backgroundNormalizedSprite.height =
    resultNormalizedSprite.height =
    resultRawSprite.height =
      r.width / 2;
  backgroundNormalizedSprite.x = r.width / 2;
  resultNormalizedSprite.x = r.width / 2;
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
    resultAlphas[i] = 0x00;
  }
}
function setData(data: GenerateColorCircleWorkerOutputData) {
  const x = Math.floor(data[2] * radius + size.width / 2);
  const y = Math.floor(data[3] * radius + size.height / 2);
  for (let xi = 0; xi < dotSize; xi++) {
    for (let yi = 0; yi < dotSize; yi++) {
      const px = x + xi - dotSize / 2;
      const py = y + yi - dotSize / 2;
      const aIndex = Math.floor(py) * size.width + Math.floor(px);
      const alpha = (resultAlphas[aIndex] += 0x05);
      if (alpha > 0xff) {
        resultAlphas[aIndex] = 0xff;
      }
      setPixel(resultRawPixels, px, py, data[4], data[5], data[6]);
      setPixel(resultNormalizedPixels, px, py, data[7], data[8], data[9]);
    }
  }
  vPixi.value?.orderPIXIRender();
}
function generate() {
  generateColorCircleCancel();
  reset();
  const task = generateColorCircle(props.petaImage, pixelCount, setData);
  console.time("convert");
  task.promise.then(() => {
    console.timeEnd("convert");
    // generate(); ストレステスト
  });
  generateColorCircleCancel = task.cancel;
}
const alphaOffset255 = computed(() => Math.pow(alphaOffset.value / 100, 5) * 255);
watch(alphaOffset, () => {
  vPixi.value?.orderPIXIRender();
});
watch(() => props.petaImage, generate, { immediate: true });
</script>
<style lang="scss" scoped>
t-color-circle-root {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  > t-circle {
    display: block;
    width: 100%;
    overflow: hidden;
    aspect-ratio: 2/1;
  }
  > input {
    display: block;
    padding: var(--px-2);
  }
}
</style>
