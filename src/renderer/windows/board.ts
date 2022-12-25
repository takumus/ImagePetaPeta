import BoardIndex from "@/renderer/components/VWBoard.vue";

import { WindowType } from "@/commons/datas/windowType";

import {
  commonTextureStoreKey,
  createCommonTextureStore,
} from "@/renderer/stores/commonTextureStore/createCommonTextureStore";
import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createPetaBoardsStore,
  petaBoardsStoreKey,
} from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";
import {
  createPetaFilesStore,
  petaFilesStoreKey,
} from "@/renderer/stores/petaFilesStore/createPetaFilesStore";
import { create } from "@/renderer/windows/@base";

create(BoardIndex, WindowType.BOARD, [
  keyStoreCreatorPair(petaFilesStoreKey, createPetaFilesStore),
  keyStoreCreatorPair(petaBoardsStoreKey, createPetaBoardsStore),
  keyStoreCreatorPair(commonTextureStoreKey, createCommonTextureStore),
]);
