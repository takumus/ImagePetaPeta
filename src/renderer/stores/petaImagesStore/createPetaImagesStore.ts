import { InjectionKey, onUnmounted, ref } from "vue";
import { IPC } from "@/renderer/ipc";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/datas/updateMode";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";
import { RPetaImage } from "@/commons/datas/rPetaImage";
export async function createPetaImagesStore() {
  const states = ref<{ [key: string]: RPetaImage }>({});
  Object.values(await IPC.send("getPetaImages")).forEach((petaImage) => {
    states.value[petaImage.id] = petaImageToRPetaImage(petaImage);
  });
  const eventEmitter = new TypedEventEmitter<{
    update: (changes: RPetaImage[], mode: UpdateMode) => void;
  }>();
  IPC.on("updatePetaImages", async (e, newPetaImages, mode) => {
    const newRPetaImages = newPetaImages.map((petaImage) => petaImageToRPetaImage(petaImage));
    if (mode === UpdateMode.INSERT || mode === UpdateMode.UPDATE) {
      newRPetaImages.forEach((newRPetaImage) => {
        const oldPetaImage = states.value[newRPetaImage.id];
        if (oldPetaImage === undefined) {
          states.value[newRPetaImage.id] = newRPetaImage;
        } else {
          Object.assign(oldPetaImage, newRPetaImage);
        }
      });
    } else if (mode === UpdateMode.REMOVE) {
      newPetaImages.forEach((petaImage) => {
        delete states.value[petaImage.id];
      });
    }
    eventEmitter.emit("update", newRPetaImages, mode);
  });
  return {
    state: states,
    getPetaImage(petaImageId?: string) {
      if (petaImageId === undefined) {
        return undefined;
      }
      return states.value[petaImageId];
    },
    clearSelection() {
      Object.values(states.value).forEach((rPetaImage) => {
        rPetaImage.renderer.selected = false;
      });
    },
    updatePetaImages(petaImages: RPetaImage[], mode: UpdateMode) {
      return IPC.send(
        "updatePetaImages",
        petaImages.map((rPetaImage) => rPetaImageToPetaImage(rPetaImage)),
        mode,
      );
    },
    onUpdate: (callback: (petaImages: RPetaImage[], mode: UpdateMode) => void) => {
      eventEmitter.on("update", callback);
      onUnmounted(() => {
        eventEmitter.off("update", callback);
      });
    },
  };
}
function petaImageToRPetaImage(petaImage: PetaImage): RPetaImage {
  return {
    ...petaImage,
    renderer: {
      selected: false,
    },
  };
}
function rPetaImageToPetaImage(rPetaImage: RPetaImage): PetaImage {
  const data = {
    ...rPetaImage,
  } as Partial<RPetaImage>;
  delete data.renderer;
  return data as PetaImage;
}
export type PetaImagesStore = Awaited<ReturnType<typeof createPetaImagesStore>>;
export const petaImagesStoreKey: InjectionKey<PetaImagesStore> = Symbol("petaImagesStore");
