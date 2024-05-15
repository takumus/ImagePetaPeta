import { Assets } from "pixi.js";
import { InjectionKey } from "vue";

import LOADINGImage from "@/_public/images/textures/loading.png";
import NOIMAGEImage from "@/_public/images/textures/noImage.png";
import NSFWImage from "@/_public/images/textures/nsfw.png";
import hsvCircleImage from "@/_public/images/utils/hsvCircle.png";

export async function createCommonTextureStore() {
  return {
    NSFW: await Assets.load(NSFWImage),
    NO: await Assets.load(NOIMAGEImage),
    LOADING: await Assets.load(LOADINGImage),
    HSV_CIRCLE: await Assets.load(hsvCircleImage),
  } as const;
}
export type CommonTextureStore = Awaited<ReturnType<typeof createCommonTextureStore>>;
export const commonTextureStoreKey: InjectionKey<CommonTextureStore> = Symbol("commonTextureStore");
