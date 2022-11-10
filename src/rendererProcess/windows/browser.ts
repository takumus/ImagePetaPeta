import BrowserIndex from "@/rendererProcess/components/VWBrowser.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/rendererProcess/stores/petaImagesStore";
import {
  createPetaBoardsStore,
  petaBoardsStoreKey,
} from "@/rendererProcess/stores/petaBoardsStore";
import { createPetaTagsStore, petaTagsStoreKey } from "@/rendererProcess/stores/petaTagsStore";
create(BrowserIndex, WindowType.BROWSER, [
  { key: petaImagesStoreKey, value: createPetaImagesStore },
  { key: petaBoardsStoreKey, value: createPetaBoardsStore },
  { key: petaTagsStoreKey, value: createPetaTagsStore },
]);
