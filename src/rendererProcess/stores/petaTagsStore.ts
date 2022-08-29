import { InjectionKey, onUnmounted, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
export async function createPetaTagsStore() {
  const states = ref<PetaTagInfo[]>(await API.send("getPetaTagInfos"));
  const eventEmitter = new EventEmitter() as TypedEmitter<{
    update: (petaImageIds: string[], petaTagIds: string[]) => void;
  }>;
  eventEmitter.setMaxListeners(100000);
  API.on("updatePetaTags", async (event, { petaTagIds, petaImageIds }) => {
    states.value = await API.send("getPetaTagInfos");
    eventEmitter.emit("update", petaTagIds, petaImageIds);
  });

  return {
    state: states,
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
