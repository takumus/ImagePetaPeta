import BoardIndex from "@/renderer/components/VWBoard.vue";
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
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
create(BoardIndex, WindowType.BOARD, [
  keyStoreCreatorPair(petaImagesStoreKey, createPetaImagesStore),
  keyStoreCreatorPair(petaBoardsStoreKey, createPetaBoardsStore),
]);
