import * as PIXI from "pixi.js";

export class PFTest extends PIXI.Filter {
  constructor() {
    super(
      undefined,
      `
        #define PI 3.1415926535897932384626433832795
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float ratio;
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        void main(void) {
          // vec4 color = texture2D(uSampler, vTextureCoord);
          vec2 c = vec2(0.5, 0.5);
          float radius = 0.4;
          vec2 d = vTextureCoord - c;
          float distance = sqrt(d.x * d.x + d.y * d.y);
          if (distance < radius) {
            float radian = atan(d.y, d.x) / PI / 2.0;
            gl_FragColor = vec4(hsv2rgb(vec3(radian, distance / radius, 1.0)), 1.0);
          } else {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
          }
        }
      `,
      { ratio: 1 },
    );
  }
}
