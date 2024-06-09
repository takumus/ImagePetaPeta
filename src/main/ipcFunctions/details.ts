import { PetaFile } from "@/commons/datas/petaFile";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useWindows } from "@/main/provides/windows";

export const detailsIPCFunctions: IpcFunctionsType["details"] = {
  async set(event, log, petaFileId: string) {
    const petaFilesController = usePetaFilesController();
    const windows = useWindows();
    log.debug(petaFileId);
    detailsPetaFile = await petaFilesController.getPetaFile(petaFileId);
    if (detailsPetaFile === undefined) {
      return;
    }
    windows.emitMainEvent(
      { type: "windowNames", windowNames: ["details"] },
      "detailsPetaFile",
      detailsPetaFile,
    );
    return;
  },
  async get(_, log) {
    log.debug(detailsPetaFile);
    return detailsPetaFile;
  },
};
let detailsPetaFile: PetaFile | undefined;
