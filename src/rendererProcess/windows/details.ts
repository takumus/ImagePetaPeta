import DetailsIndex from "@/rendererProcess/components/VWDetails.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/rendererProcess/stores/petaImagesStore";
import { createPetaTagsStore, petaTagsStoreKey } from "@/rendererProcess/stores/petaTagsStore";
create(DetailsIndex, WindowType.DETAILS, [
  { key: petaImagesStoreKey, value: createPetaImagesStore },
  { key: petaTagsStoreKey, value: createPetaTagsStore },
]);
