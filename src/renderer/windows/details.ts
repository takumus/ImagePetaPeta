import DetailsIndex from "@/renderer/components/VWDetails.vue";

import { WindowType } from "@/commons/datas/windowType";

import { injectAnimatedGIFAsset } from "@/renderer/libs/pixi-gif/animatedGIFAsset";
import {
  commonTextureStoreKey,
  createCommonTextureStore,
} from "@/renderer/stores/commonTextureStore/createCommonTextureStore";
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createPetaFilesStore,
  petaFilesStoreKey,
} from "@/renderer/stores/petaFilesStore/createPetaFilesStore";
import {
  createPetaTagsStore,
  petaTagsStoreKey,
} from "@/renderer/stores/petaTagsStore/createPetaTagsStore";
import { create } from "@/renderer/windows/@base";

injectAnimatedGIFAsset();
create(DetailsIndex, WindowType.DETAILS, [
  keyStoreCreatorPair(petaFilesStoreKey, createPetaFilesStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
  keyStoreCreatorPair(commonTextureStoreKey, createCommonTextureStore),
]);
