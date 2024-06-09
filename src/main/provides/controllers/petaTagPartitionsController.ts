import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { UpdateMode } from "@/commons/datas/updateMode";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBPetaTagPartitions } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class PetaTagPartitionsController {
  async getAll() {
    const dbPetaTagPartitions = useDBPetaTagPartitions();
    return dbPetaTagPartitions.getAll();
  }
  async updateMultiple(tags: PetaTagPartition[], mode: UpdateMode, silent = false) {
    const tasks = useTasks();
    const windows = useWindows();
    const task = tasks.spawn("UpdatePetaTagPartitions", silent);
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "begin",
    });
    await ppa(async (tag, index) => {
      await this.updatePetaTagPartition(tag, mode);
      task.emitStatus({
        i18nKey: "tasks.updateDatas",
        progress: {
          all: tags.length,
          current: index + 1,
        },
        status: "progress",
      });
    }, tags).promise;
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "complete",
    });
    windows.emitMainEvent(
      { type: "windowNames", windowNames: ["browser"] },
      "updatePetaTagPartitions",
      tags,
      mode,
    );
    return true;
  }
  async updatePetaTagPartition(petaPetaTagPartition: PetaTagPartition, mode: UpdateMode) {
    const dbPetaTagPartitions = useDBPetaTagPartitions();
    const log = useLogger().logMainChunk();
    log.debug("##Update PetaTagPartition");
    log.debug("mode:", mode);
    log.debug("tag:", minimizeID(petaPetaTagPartition.id));
    if (mode === "remove") {
      await dbPetaTagPartitions.remove({ id: petaPetaTagPartition.id });
    } else if (mode === "update") {
      await dbPetaTagPartitions.update({ id: petaPetaTagPartition.id }, petaPetaTagPartition);
    } else {
      await dbPetaTagPartitions.insert(petaPetaTagPartition);
    }
    return petaPetaTagPartition.id;
  }
}
export const petaTagPartitionsControllerKey = createKey<PetaTagPartitionsController>(
  "petaTagPartitionsController",
);
export const usePetaTagPartitionsCOntroller = createUseFunction(petaTagPartitionsControllerKey);
