import {
  generateGamutMapWorkerInputData,
  generateGamutMapWorkerOutputData,
} from "@/renderer/components/commons/property/worker/generateGamutMapWorkerData";
import { initWebWorker } from "@/renderer/libs/initWebWorker";

// import * as convert from "color-convert";
export default initWebWorker<generateGamutMapWorkerInputData, generateGamutMapWorkerOutputData>(
  self,
  (worker) => {
    function rgb2hsv(r: number, g: number, b: number) {
      (r = r / 255), (g = g / 255), (b = b / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const v = max;
      const d = max - min;
      s = max == 0 ? 0 : d / max;
      if (max == min) {
        h = 0; // achromatic
      } else {
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return [h, s, v] as const;
    }
    function hsv2rgb(h: number, s: number, v: number) {
      let r = 0;
      let g = 0;
      let b = 0;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0:
          (r = v), (g = t), (b = p);
          break;
        case 1:
          (r = q), (g = v), (b = p);
          break;
        case 2:
          (r = p), (g = v), (b = t);
          break;
        case 3:
          (r = p), (g = q), (b = v);
          break;
        case 4:
          (r = t), (g = p), (b = v);
          break;
        case 5:
          (r = v), (g = p), (b = q);
          break;
      }
      return [r * 255, g * 255, b * 255] as const;
    }
    worker.addEventListener("message", async (e) => {
      const canvas = new OffscreenCanvas(0, 0);
      const context = canvas.getContext("2d");
      const patchCanvas = new OffscreenCanvas(0, 0);
      const patchContext = patchCanvas.getContext("2d");
      if (patchContext === null || context === null) {
        throw new Error("context is undefined!");
      }
      const pixels = e.data.pixels;
      const resolution = e.data.resolution;
      const length = pixels.length;
      let step = 1;
      if (length / 4 > resolution && resolution > 0) {
        step = Math.round(length / 4 / resolution);
      }
      for (let i = 0; i < length; i += 4 * step) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r === undefined || g === undefined || b === undefined) {
          continue;
        }
        const hsv = rgb2hsv(r, g, b);
        const s = hsv[1] * hsv[2];
        const v = s * 0.5 + 0.5;
        const cColor = hsv2rgb(hsv[0], s, v);
        const radian = -hsv[0] * (Math.PI * 2) - Math.PI / 6;
        const radius = hsv[1] * hsv[2];
        const x = Math.cos(radian) * radius;
        const y = Math.sin(radian) * radius;
        worker.postMessage([
          0,
          !(i + 4 * step < length),
          x,
          y,
          r,
          g,
          b,
          cColor[0],
          cColor[1],
          cColor[2],
        ] as generateGamutMapWorkerOutputData);
      }
    });
  },
);
