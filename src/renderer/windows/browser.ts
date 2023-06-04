import VWindow from "@/renderer/components/VWindowBrowser.vue";

import { injectAnimatedGIFAsset } from "@/renderer/libs/pixi-gif/animatedGIFAsset";
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createPetaBoardsStore,
  petaBoardsStoreKey,
} from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";
import {
  createPetaFilesStore,
  petaFilesStoreKey,
} from "@/renderer/stores/petaFilesStore/createPetaFilesStore";
import {
  createPetaTagPartitionsStore,
  petaTagPartitionsStoreKey,
} from "@/renderer/stores/petaTagPartitionsStore/createPetaTagPartitionsStore";
import {
  createPetaTagsStore,
  petaTagsStoreKey,
} from "@/renderer/stores/petaTagsStore/createPetaTagsStore";
import { create } from "@/renderer/windows/@base";

injectAnimatedGIFAsset();
create(VWindow, "browser", [
  keyStoreCreatorPair(petaFilesStoreKey, createPetaFilesStore),
  keyStoreCreatorPair(petaBoardsStoreKey, createPetaBoardsStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
  keyStoreCreatorPair(petaTagPartitionsStoreKey, createPetaTagPartitionsStore),
]);
