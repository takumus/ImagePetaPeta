import { InjectionKey, onUnmounted, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { PetaTag } from "@/commons/datas/petaTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
export async function createPetaTagsStore() {
  const petaTags = ref(await API.send("getPetaTags"));
  const petaTagCounts = ref(await API.send("getPetaTagCounts"));
  const eventEmitter = new EventEmitter() as TypedEmitter<{
    update: (petaImageIds: string[], petaTagIds: string[]) => void;
  }>;
  eventEmitter.setMaxListeners(100000);
  API.on("updatePetaTags", async (event, { petaTagIds, petaImageIds }) => {
    petaTags.value = await API.send("getPetaTags");
    eventEmitter.emit("update", petaTagIds, petaImageIds);
  });
  API.on("updatePetaTagCounts", async (event, _petaTagCounts) => {
    petaTagCounts.value = _petaTagCounts;
  });
  return {
    state: {
      petaTags,
      petaTagCounts,
    },
    updatePetaTags(petaTags: PetaTag[], mode: UpdateMode) {
      return API.send("updatePetaTags", petaTags, mode);
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
