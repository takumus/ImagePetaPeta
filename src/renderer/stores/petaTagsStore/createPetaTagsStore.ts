import { InjectionKey, onUnmounted, ref } from "vue";

import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import { UpdateMode } from "@/commons/datas/updateMode";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { IPC } from "@/renderer/ipc";

export async function createPetaTagsStore() {
  const petaTags = ref(
    (await IPC.send("getPetaTags")).map((petaTag) => petaTagToRPetaTag(petaTag)),
  );
  const eventEmitter = new TypedEventEmitter<{
    update: (petaImageIds: string[], petaTagIds: string[]) => void;
  }>();
  IPC.on("updatePetaTags", async (event, { petaTagIds, petaImageIds }) => {
    petaTags.value = (await IPC.send("getPetaTags")).map((petaTag) => petaTagToRPetaTag(petaTag));
    eventEmitter.emit("update", petaTagIds, petaImageIds);
  });
  return {
    state: {
      petaTags,
    },
    updatePetaTags(petaTagLikes: PetaTagLike[], mode: UpdateMode) {
      petaTagLikes.map((petaTagLike): PetaTagLike => {
        if (petaTagLike.type === "petaTag") {
          return {
            type: "petaTag",
            petaTag: rPetaTagToPetaTag(petaTagLike.petaTag as RPetaTag),
          };
        }
        return petaTagLike;
      });
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
function petaTagToRPetaTag(petaTag: PetaTag): RPetaTag {
  return {
    ...petaTag,
    renderer: {
      selected: false,
    },
  };
}
function rPetaTagToPetaTag(rPetaTag: RPetaTag): PetaTag {
  const data = {
    ...rPetaTag,
  } as Partial<RPetaTag>;
  delete data.renderer;
  return data as PetaTag;
}
export type PetaTagsStore = Awaited<ReturnType<typeof createPetaTagsStore>>;
export const petaTagsStoreKey: InjectionKey<PetaTagsStore> = Symbol("petaTagsStore");
