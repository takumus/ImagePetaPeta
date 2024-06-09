import { InjectionKey, onUnmounted, ref } from "vue";

import { PetaFile } from "@/commons/datas/petaFile";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { UpdateMode } from "@/commons/datas/updateMode";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { IPC } from "@/renderer/libs/ipc";

export async function createPetaFilesStore() {
  const states = ref<{ [key: string]: RPetaFile }>({});
  Object.values(await IPC.petaFiles.getAll()).forEach((petaFile) => {
    states.value[petaFile.id] = petaFileToRPetaFile(petaFile);
  });
  const eventEmitter = new TypedEventEmitter<{
    update: (changes: RPetaFile[], mode: UpdateMode) => void;
  }>();
  IPC.on("updatePetaFiles", async (e, newPetaFiles, mode) => {
    const newRPetaFiles = newPetaFiles.map((petaFile) => petaFileToRPetaFile(petaFile));
    if (mode === "insert" || mode === "update") {
      newRPetaFiles.forEach((newRPetaFile) => {
        const oldPetaFile = states.value[newRPetaFile.id];
        if (oldPetaFile === undefined) {
          states.value[newRPetaFile.id] = newRPetaFile;
        } else {
          Object.assign(oldPetaFile, { ...newRPetaFile, renderer: oldPetaFile.renderer });
        }
      });
    } else if (mode === "remove") {
      newPetaFiles.forEach((petaFile) => {
        delete states.value[petaFile.id];
      });
    }
    eventEmitter.emit("update", newRPetaFiles, mode);
  });
  return {
    state: states,
    getPetaFile(petaFileId?: string) {
      if (petaFileId === undefined) {
        return undefined;
      }
      return states.value[petaFileId];
    },
    clearSelection() {
      Object.values(states.value).forEach((rPetaFile) => {
        rPetaFile.renderer.selected = false;
      });
    },
    updatePetaFiles(petaFiles: RPetaFile[], mode: UpdateMode) {
      return IPC.petaFiles.update(
        petaFiles.map((rPetaFile) => rPetaFileToPetaFile(rPetaFile)),
        mode,
      );
    },
    onUpdate: (callback: (petaFiles: RPetaFile[], mode: UpdateMode) => void) => {
      eventEmitter.on("update", callback);
      onUnmounted(() => {
        eventEmitter.off("update", callback);
      });
    },
  };
}
function petaFileToRPetaFile(petaFile: PetaFile): RPetaFile {
  return {
    ...petaFile,
    renderer: {
      selected: false,
    },
  };
}
function rPetaFileToPetaFile(rPetaFile: RPetaFile): PetaFile {
  const data = {
    ...rPetaFile,
  } as Partial<RPetaFile>;
  delete data.renderer;
  return data as PetaFile;
}
export type PetaFilesStore = Awaited<ReturnType<typeof createPetaFilesStore>>;
export const petaFilesStoreKey: InjectionKey<PetaFilesStore> = Symbol("petaFilesStore");
