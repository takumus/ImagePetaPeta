import { UpdateMode } from "@/commons/datas/updateMode";
import * as Tasks from "@/mainProcess/tasks/task";
import { PetaDatas } from "@/mainProcess/petaDatas";
// import { migratePetaTagPartition } from "@/mainProcess/utils/migrater";
import { ppa } from "@/commons/utils/pp";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { TaskStatusCode } from "@/commons/datas/task";
import { minimId } from "@/commons/utils/utils";
export class PetaDataPetaTagPartitions {
  constructor(private parent: PetaDatas) {}
  async getPetaTagPartitions() {
    return this.parent.datas.dbPetaTagPartitions.getAll();
  }
  async updatePetaTagPartitions(tags: PetaTagPartition[], mode: UpdateMode, silent = false) {
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
        this.parent.emitMainEvent("updatePetaTagPartitions", tags, mode);
        return true;
      },
      {},
      silent,
    );
  }
  async updatePetaTagPartition(petaPetaTagPartition: PetaTagPartition, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaTagPartition");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaPetaTagPartition.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaTagPartitions.remove({ id: petaPetaTagPartition.id });
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaTagPartitions.update(
        { id: petaPetaTagPartition.id },
        petaPetaTagPartition,
      );
    } else {
      await this.parent.datas.dbPetaTagPartitions.insert(petaPetaTagPartition);
    }
    return petaPetaTagPartition.id;
  }
}
