import * as PIXI from "pixi.js";

export class PFGrayScaleByLuminous extends PIXI.Filter {
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
            0.299 * color.r
            + 0.587 * color.g
            + 0.114 * color.b
          );
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
