import { InjectionKey, onUnmounted, ref } from "vue";
import { IPC } from "@/rendererProcess/ipc";
import { inject } from "@/rendererProcess/utils/vue";
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { UpdateMode } from "@/commons/datas/updateMode";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
export async function createPetaTagsStore() {
  const petaTags = ref(await IPC.send("getPetaTags"));
  const petaTagCounts = ref(await IPC.send("getPetaTagCounts"));
  const eventEmitter = new EventEmitter() as TypedEmitter<{
    update: (petaImageIds: string[], petaTagIds: string[]) => void;
  }>;
  eventEmitter.setMaxListeners(100000);
  IPC.on("updatePetaTags", async (event, { petaTagIds, petaImageIds }) => {
    petaTags.value = await IPC.send("getPetaTags");
    eventEmitter.emit("update", petaTagIds, petaImageIds);
  });
  IPC.on("updatePetaTagCounts", async (event, _petaTagCounts) => {
    petaTagCounts.value = _petaTagCounts;
  });
  return {
    state: {
      petaTags,
      petaTagCounts,
    },
    updatePetaTags(petaTagLikes: PetaTagLike[], mode: UpdateMode) {
      return IPC.send("updatePetaTags", petaTagLikes, mode);
    },
    onUpdate: (callback: (petaTagIds: string[], petaImageIds: string[]) => void) => {
      eventEmitter.on("update", callback);
      onUnmounted(() => {
        eventEmitter.off("update", callback);
      });
    },
  };
}
export function usePetaTagsStore() {
  return inject(petaTagsStoreKey);
}
export type PetaTagsStore = Awaited<ReturnType<typeof createPetaTagsStore>>;
export const petaTagsStoreKey: InjectionKey<PetaTagsStore> = Symbol("petaTagsStore");
