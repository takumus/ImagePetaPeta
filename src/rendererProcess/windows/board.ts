import BoardIndex from "@/rendererProcess/windows/board.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
import { createPetaImagesStore, petaImagesStoreKey } from "@/rendererProcess/stores/petaImagesStore";
import { createPetaBoardsStore, petaBoardsStoreKey } from "@/rendererProcess/stores/petaBoardsStore";
create(BoardIndex, WindowType.BOARD, [
  { key: petaImagesStoreKey, value: createPetaImagesStore },
  { key: petaBoardsStoreKey, value: createPetaBoardsStore },
]);
