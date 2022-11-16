import { InjectionKey, onUnmounted, ref } from "vue";
import { IPC } from "@/renderer/ipc";
import { UpdateMode } from "@/commons/datas/updateMode";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";
export async function createPetaTagsStore() {
  const petaTags = ref(await IPC.send("getPetaTags"));
  const petaTagCounts = ref(await IPC.send("getPetaTagCounts"));
  const eventEmitter = new TypedEventEmitter<{
    update: (petaImageIds: string[], petaTagIds: string[]) => void;
  }>();
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
export type PetaTagsStore = Awaited<ReturnType<typeof createPetaTagsStore>>;
export const petaTagsStoreKey: InjectionKey<PetaTagsStore> = Symbol("petaTagsStore");
