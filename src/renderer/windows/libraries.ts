import VWindow from "@/renderer/components/VWindowLibraries.vue";

import { keyStoreCreatorPair } from "@/renderer/stores/keyStoreCreatorPair";
import {
  createLibrariesStore,
  librariesStoreKey,
} from "@/renderer/stores/librariesStore/createLibrariesStore";
import { create } from "@/renderer/windows/@base";

create(VWindow, "libraries", [keyStoreCreatorPair(librariesStoreKey, createLibrariesStore)], true);
