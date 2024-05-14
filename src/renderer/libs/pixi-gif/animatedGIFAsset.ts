import type { AssetExtension, DOMAdapter } from "pixi.js";
import { extensions, ExtensionType, path } from "pixi.js";

import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";
import { AnimatedGIFResource } from "@/renderer/libs/pixi-gif/animatedGIFResource";

export function injectAnimatedGIFAsset() {
  const AnimatedGIFAsset = {
    extension: ExtensionType.Asset,
    detection: {
      test: async () => true,
      add: async (formats) => [...formats, "gif"],
      remove: async (formats) => formats.filter((format) => format !== "gif"),
    },
    loader: {
      test: (url) => path.extname(url) === ".gif",
      load: async (url, asset) => {
        asset;
        const response = await fetch(url);
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
