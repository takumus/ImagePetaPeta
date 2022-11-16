import { extensions, ExtensionType, settings, utils } from "@pixi/core";
import type { AssetExtension } from "@pixi/assets";
import { AnimatedGIF } from "@/renderer/utils/pixi-gif/animatedGIF";
import { AnimatedGIFResource } from "@/renderer/utils/pixi-gif/animatedGIFResource";
export function injectAnimatedGIFAsset() {
  const AnimatedGIFAsset = {
    extension: ExtensionType.Asset,
    detection: {
      test: async () => true,
      add: async (formats) => [...formats, "gif"],
      remove: async (formats) => formats.filter((format) => format !== "gif"),
    },
    loader: {
      test: (url) => utils.path.extname(url) === ".gif",
      load: async (url, asset) => {
        asset;
        const response = await settings.ADAPTER.fetch(url);
        const buffer = await response.arrayBuffer();
        return new AnimatedGIFResource(buffer);
      },
      unload: async (asset) => {
        asset.destroy();
      },
    },
  } as AssetExtension<AnimatedGIF>;
  extensions.add(AnimatedGIFAsset);
}