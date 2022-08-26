import { InjectionKey, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";
// import EventEmitter from "events";
// import TypedEmitter from "typed-emitter";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
export async function createPetaTagsStore() {
  const states = ref<PetaTagInfo[]>(await API.send("getPetaTagInfos"));
  // const eventEmitter = new EventEmitter() as TypedEmitter<{
  //   update: (changes: PetaImage[], mode: UpdateMode) => void;
  // }>;
  API.on("updatePetaTags", async () => {
    states.value = await API.send("getPetaTagInfos");
  });

  return {
    state: states,
  };
}
export function usePetaTagsStore() {
  return inject(petaTagsStoreKey);
}
export type PetaTagsStore = Awaited<ReturnType<typeof createPetaTagsStore>>;
export const petaTagsStoreKey: InjectionKey<PetaTagsStore> = Symbol("petaTagsStore");
