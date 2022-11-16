import DetailsIndex from "@/renderer/components/VWDetails.vue";
import { create } from "@/renderer/windows/@base";
import { WindowType } from "@/commons/datas/windowType";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/renderer/stores/petaImagesStore/createPetaImagesStore";
import { createPetaTagsStore, petaTagsStoreKey } from "@/renderer/stores/petaTagsStore";
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
create(DetailsIndex, WindowType.DETAILS, [
  keyStoreCreatorPair(petaImagesStoreKey, createPetaImagesStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
]);
