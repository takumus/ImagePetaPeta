import { Assets, Texture } from "pixi.js";
import { InjectionKey } from "vue";

import { ObjectKeys } from "@/commons/utils/objectKeys";

import DASHED_LINE from "@/_public/images/textures/dashedLine.png";
import LOADING from "@/_public/images/textures/loading.png";
import NO from "@/_public/images/textures/noImage.png";
import NSFW from "@/_public/images/textures/nsfw.png";
import HSV_CIRCLE from "@/_public/images/utils/hsvCircle.png";

const textureURLs = {
  NSFW,
  NO,
  LOADING,
  HSV_CIRCLE,
  DASHED_LINE,
};

export async function createCommonTextureStore() {
  const textures: { [key in keyof typeof textureURLs]: Texture } = {} as any;
  await Promise.all(
    ObjectKeys(textureURLs).map(
      async (key) => (textures[key] = await Assets.load(textureURLs[key])),
    ),
  );
  return textures as Readonly<typeof textures>;
}
export type CommonTextureStore = Awaited<ReturnType<typeof createCommonTextureStore>>;
export const commonTextureStoreKey: InjectionKey<CommonTextureStore> = Symbol("commonTextureStore");
