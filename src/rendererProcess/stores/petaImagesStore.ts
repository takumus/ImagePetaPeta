import { InjectionKey, onUnmounted, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
export async function createPetaImagesStore() {
  const states = ref(await API.send("getPetaImages"));
  const selection = ref<{ [key: string]: boolean }>({});
  const eventEmitter = new EventEmitter() as TypedEmitter<{
    update: (changes: PetaImage[], mode: UpdateMode) => void;
  }>;
  API.on("updatePetaImages", async (e, newPetaImages, mode) => {
    if (mode === UpdateMode.INSERT || mode === UpdateMode.UPDATE) {
      newPetaImages.forEach((newPetaImage) => {
        const oldPetaImage = states.value[newPetaImage.id];
        if (oldPetaImage === undefined) {
          states.value[newPetaImage.id] = newPetaImage;
        } else {
          Object.assign(oldPetaImage, newPetaImage);
        }
      });
    } else if (mode === UpdateMode.REMOVE) {
      newPetaImages.forEach((petaImage) => {
        delete states.value[petaImage.id];
      });
    }
    eventEmitter.emit("update", newPetaImages, mode);
  });
  return {
    state: states,
    getPetaImage(petaImageId?: string) {
      if (petaImageId === undefined) {
        return undefined;
      }
      return states.value[petaImageId];
    },
    setSelected(petaImage: PetaImage, selected: boolean) {
      selection.value[petaImage.id] = selected;
    },
    getSelected(petaImage: PetaImage) {
      return selection.value[petaImage.id] === true;
    },
    updatePetaImages(petaImages: PetaImage[], mode: UpdateMode) {
      return API.send("updatePetaImages", petaImages, mode);
    },
    onUpdate: (callback: (petaImages: PetaImage[], mode: UpdateMode) => void) => {
      eventEmitter.on("update", callback);
      onUnmounted(() => {
        eventEmitter.off("update", callback);
      });
    },
  };
}
export function usePetaImagesStore() {
  return inject(petaImagesStoreKey);
}
export type PetaImagesStore = Awaited<ReturnType<typeof createPetaImagesStore>>;
export const petaImagesStoreKey: InjectionKey<PetaImagesStore> = Symbol("petaImagesStore");
