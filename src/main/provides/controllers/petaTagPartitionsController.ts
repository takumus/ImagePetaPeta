import { UpdateMode } from "@/commons/datas/updateMode";
import * as Tasks from "@/main/tasks/task";
// import { migratePetaTagPartition } from "@/main/utils/migrater";
import { ppa } from "@/commons/utils/pp";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { TaskStatusCode } from "@/commons/datas/task";
import { minimId } from "@/commons/utils/utils";
import { createKey, inject } from "@/main/utils/di";
import { dbPetaTagPartitionsKey } from "@/main/provides/databases";
import { loggerKey } from "@/main/provides/utils/logger";
import { emitMainEventKey } from "@/main/provides/utils/emitMainEvent";
export class PetaTagPartitionsController {
  async getPetaTagPartitions() {
    const dbPetaTagPartitions = inject(dbPetaTagPartitionsKey);
    return dbPetaTagPartitions.getAll();
  }
  async updatePetaTagPartitions(tags: PetaTagPartition[], mode: UpdateMode, silent = false) {
    const emit = inject(emitMainEventKey);
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
    const logger = inject(loggerKey);
    const dbPetaTagPartitions = inject(dbPetaTagPartitionsKey);
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
