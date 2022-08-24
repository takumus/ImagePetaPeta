import DetailsIndex from "@/rendererProcess/windows/details.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
import { createPetaImagesStore, petaImagesStoreKey } from "@/rendererProcess/stores/petaImagesStore";
create(DetailsIndex, WindowType.DETAILS, [{ key: petaImagesStoreKey, value: createPetaImagesStore }]);
