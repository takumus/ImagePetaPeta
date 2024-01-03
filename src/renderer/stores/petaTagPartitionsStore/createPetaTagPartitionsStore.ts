import { InjectionKey, ref } from "vue";

import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { UpdateMode } from "@/commons/datas/updateMode";

import { IPC } from "@/renderer/libs/ipc";

export async function createPetaTagPartitionsStore() {
  const petaTagPartitions = ref(await IPC.getPetaTagPartitions());
  IPC.on("updatePetaTagPartitions", async () => {
    petaTagPartitions.value = await IPC.getPetaTagPartitions();
    // console.log(_petaTagPartitions);
  });
  return {
    state: {
      petaTagPartitions,
    },
    updatePetaTagPartitions(petaTagPartitions: PetaTagPartition[], mode: UpdateMode) {
      return IPC.updatePetaTagPartitions(petaTagPartitions, mode);
    },
  };
}
export type PetaTagPartitionsStore = Awaited<ReturnType<typeof createPetaTagPartitionsStore>>;
export const petaTagPartitionsStoreKey: InjectionKey<PetaTagPartitionsStore> =
  Symbol("petaTagPartitionsStore");
