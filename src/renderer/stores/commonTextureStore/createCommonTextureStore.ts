import * as PIXI from "pixi.js";
import { InjectionKey } from "vue";

import LOADINGImage from "@/@assets/loadingBackground.png";
import NOIMAGEImage from "@/@assets/noImageBackground.png";
import NSFWImage from "@/@assets/nsfwBackground.png";

export async function createCommonTextureStore() {
  return {
    NSFW: await PIXI.Texture.fromURL(NSFWImage),
    NO: await PIXI.Texture.fromURL(NOIMAGEImage),
    LOADING: await PIXI.Texture.fromURL(LOADINGImage),
  } as const;
}
export type CommonTextureStore = Awaited<ReturnType<typeof createCommonTextureStore>>;
export const commonTextureStoreKey: InjectionKey<CommonTextureStore> = Symbol("commonTextureStore");
