import DetailsIndex from "@/renderer/components/VWDetails.vue";

import { WindowType } from "@/commons/datas/windowType";

import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/renderer/stores/petaImagesStore/createPetaImagesStore";
import {
  createPetaTagsStore,
  petaTagsStoreKey,
} from "@/renderer/stores/petaTagsStore/createPetaTagsStore";
import { create } from "@/renderer/windows/@base";

create(DetailsIndex, WindowType.DETAILS, [
  keyStoreCreatorPair(petaImagesStoreKey, createPetaImagesStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
]);
