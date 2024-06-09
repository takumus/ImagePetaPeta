import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useFileImporter } from "@/main/provides/fileImporter";

export const importerIPCFunctions: IpcFunctionsType["importer"] = {
  async browse(event, logger, type) {
    const fileImporter = useFileImporter();
    const files = await fileImporter.browseFiles(event, type);
    logger.debug(files);
    return files;
  },
  async import(event, log, datas) {
    const fileImporter = useFileImporter();
    try {
      log.debug(datas.length, datas);
      const petaFileIds = await fileImporter.importFilesFromImportFileGroup(datas);
      log.debug("return:", petaFileIds.length);
      return petaFileIds;
    } catch (e) {
      log.error(e);
    }
    return [];
  },
};
