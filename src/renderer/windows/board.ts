import BoardIndex from "@/renderer/components/VWBoard.vue";

import { WindowType } from "@/commons/datas/windowType";

import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createPetaBoardsStore,
  petaBoardsStoreKey,
} from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";
import {
  createPetaImagesStore,
  petaImagesStoreKey,
} from "@/renderer/stores/petaImagesStore/createPetaImagesStore";
import { create } from "@/renderer/windows/@base";

create(BoardIndex, WindowType.BOARD, [
  keyStoreCreatorPair(petaImagesStoreKey, createPetaImagesStore),
  keyStoreCreatorPair(petaBoardsStoreKey, createPetaBoardsStore),
]);
