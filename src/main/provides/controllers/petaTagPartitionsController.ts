import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowType } from "@/commons/datas/windowType";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as Tasks from "@/main/libs/task";
import { useDBPetaTagPartitions } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType } from "@/main/provides/windows";
import { emitMainEvent } from "@/main/utils/emitMainEvent";

export class PetaTagPartitionsController {
  async getAll() {
    const dbPetaTagPartitions = useDBPetaTagPartitions();
    return dbPetaTagPartitions.getAll();
  }
  async updateMultiple(tags: PetaTagPartition[], mode: UpdateMode, silent = false) {
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
        emitMainEvent(
          { type: EmitMainEventTargetType.WINDOW_TYPES, windowTypes: [WindowType.BROWSER] },
          "updatePetaTagPartitions",
          tags,
          mode,
        );
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
    log.log("tag:", minimizeID(petaPetaTagPartition.id));
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
