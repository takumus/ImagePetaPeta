import DetailsIndex from "@/renderer/components/VWDetails.vue";

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
create(DetailsIndex, "details", [
  keyStoreCreatorPair(petaFilesStoreKey, createPetaFilesStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
  keyStoreCreatorPair(commonTextureStoreKey, createCommonTextureStore),
]);
