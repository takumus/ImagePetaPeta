import BrowserIndex from "@/renderer/components/VWBrowser.vue";
import { create } from "@/renderer/windows/@base";
import { WindowType } from "@/commons/datas/windowType";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/renderer/stores/petaImagesStore/createPetaImagesStore";
import {
  createPetaBoardsStore,
  petaBoardsStoreKey,
} from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";
import {
  createPetaTagsStore,
  petaTagsStoreKey,
} from "@/renderer/stores/petaTagsStore/createPetaTagsStore";
import {
  createPetaTagPartitionsStore,
  petaTagPartitionsStoreKey,
} from "@/renderer/stores/petaTagPartitionsStore/createPetaTagPartitionsStore";
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
create(BrowserIndex, WindowType.BROWSER, [
  keyStoreCreatorPair(petaImagesStoreKey, createPetaImagesStore),
  keyStoreCreatorPair(petaBoardsStoreKey, createPetaBoardsStore),
  keyStoreCreatorPair(petaTagsStoreKey, createPetaTagsStore),
  keyStoreCreatorPair(petaTagPartitionsStoreKey, createPetaTagPartitionsStore),
]);
