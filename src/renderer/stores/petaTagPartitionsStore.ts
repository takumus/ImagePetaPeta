import { InjectionKey, ref } from "vue";
import { IPC } from "@/renderer/ipc";
import { inject } from "@/renderer/utils/vue";
import { UpdateMode } from "@/commons/datas/updateMode";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
export async function createPetaTagPartitionsStore() {
  const petaTagPartitions = ref(await IPC.send("getPetaTagPartitions"));
  IPC.on("updatePetaTagPartitions", async () => {
    petaTagPartitions.value = await IPC.send("getPetaTagPartitions");
    // console.log(_petaTagPartitions);
  });
  return {
    state: {
      petaTagPartitions,
    },
    updatePetaTagPartitions(petaTagPartitions: PetaTagPartition[], mode: UpdateMode) {
      return IPC.send("updatePetaTagPartitions", petaTagPartitions, mode);
    },
  };
}
export function usePetaTagPartitionsStore() {
  return inject(petaTagPartitionsStoreKey);
}
export type PetaTagPartitionsStore = Awaited<ReturnType<typeof createPetaTagPartitionsStore>>;
export const petaTagPartitionsStoreKey: InjectionKey<PetaTagPartitionsStore> =
  Symbol("petaTagPartitionsStore");
