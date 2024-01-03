import { InjectionKey, ref } from "vue";

import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { UpdateMode } from "@/commons/datas/updateMode";

import { IPC } from "@/renderer/libs/ipc";

export async function createPetaTagPartitionsStore() {
  const petaTagPartitions = ref(await IPC.main.getPetaTagPartitions());
  IPC.on("updatePetaTagPartitions", async () => {
    petaTagPartitions.value = await IPC.main.getPetaTagPartitions();
    // console.log(_petaTagPartitions);
  });
  return {
    state: {
      petaTagPartitions,
    },
    updatePetaTagPartitions(petaTagPartitions: PetaTagPartition[], mode: UpdateMode) {
      return IPC.main.updatePetaTagPartitions(petaTagPartitions, mode);
    },
  };
}
export type PetaTagPartitionsStore = Awaited<ReturnType<typeof createPetaTagPartitionsStore>>;
export const petaTagPartitionsStoreKey: InjectionKey<PetaTagPartitionsStore> =
  Symbol("petaTagPartitionsStore");
