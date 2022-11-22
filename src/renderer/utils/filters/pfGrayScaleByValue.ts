import * as PIXI from "pixi.js";

export class PFGrayScaleByValue extends PIXI.Filter {
  constructor() {
    super(
      undefined,
      `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float ratio;
        void main(void) {
          vec4 color = texture2D(uSampler, vTextureCoord);
          float y = (
            max(max(color.r, color.g), color.b)
            + min(min(color.r, color.g), color.b)
          ) / 2.0;
          color.r = mix(color.r, y, ratio);
          color.g = mix(color.g, y, ratio);
          color.b = mix(color.b, y, ratio);
          gl_FragColor = color;
        }
      `,
      { ratio: 1 },
    );
  }
}
