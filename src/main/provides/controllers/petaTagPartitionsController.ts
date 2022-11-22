import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
// import { migratePetaTagPartition } from "@/main/utils/migrater";
import { ppa } from "@/commons/utils/pp";
import { minimId } from "@/commons/utils/utils";

import { useDBPetaTagPartitions } from "@/main/provides/databases";
import { useEmitMainEvent } from "@/main/provides/utils/emitMainEvent";
import { useLogger } from "@/main/provides/utils/logger";
import * as Tasks from "@/main/tasks/task";
import { createKey, createUseFunction } from "@/main/utils/di";

export class PetaTagPartitionsController {
  async getPetaTagPartitions() {
    const dbPetaTagPartitions = useDBPetaTagPartitions();
    return dbPetaTagPartitions.getAll();
  }
  async updatePetaTagPartitions(tags: PetaTagPartition[], mode: UpdateMode, silent = false) {
    const emit = useEmitMainEvent();
    return Tasks.spawn(
      "UpdatePetaTagPartitions",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.BEGIN,
        });
        await ppa(async (tag, index) => {
          await this.updatePetaTagPartition(tag, mode);
          handler.emitStatus({
            i18nKey: "tasks.updateDatas",
            progress: {
              all: tags.length,
              current: index + 1,
            },
            status: TaskStatusCode.PROGRESS,
          });
        }, tags).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.COMPLETE,
        });
        emit("updatePetaTagPartitions", tags, mode);
        return true;
      },
      {},
      silent,
    );
  }
  async updatePetaTagPartition(petaPetaTagPartition: PetaTagPartition, mode: UpdateMode) {
    const logger = useLogger();
    const dbPetaTagPartitions = useDBPetaTagPartitions();
    const log = logger.logMainChunk();
    log.log("##Update PetaTagPartition");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaPetaTagPartition.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaTagPartitions.remove({ id: petaPetaTagPartition.id });
    } else if (mode === UpdateMode.UPDATE) {
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
