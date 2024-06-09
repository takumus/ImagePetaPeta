import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useModals } from "@/main/provides/modals";

export const modalsIPCFunctions: IpcFunctionsType["modals"] = {
  async open(event, log, label, items) {
    const index = await useModals().open(event, label, items);
    log.debug("return:", index);
    return index;
  },
  async select(_, log, id, index) {
    useModals().select(id, index);
    log.debug("return:", index);
  },
  async getAll(_, log) {
    const datas = useModals().getOrders();
    log.debug(datas);
    return datas;
  },
};
