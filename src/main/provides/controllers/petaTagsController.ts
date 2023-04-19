import { PetaFilePetaTag, createPetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag, createPetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as Tasks from "@/main/libs/task";
import { useDBPetaFilesPetaTags, useDBPetaTags } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType } from "@/main/provides/windows";
import { emitMainEvent } from "@/main/utils/emitMainEvent";

export class PetaTagsController {
  async updateMultiple(tags: PetaTagLike[], mode: UpdateMode, silent = false) {
    return Tasks.spawn(
      "UpdatePetaTags",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.BEGIN,
        });
        const tagIds = await ppa(async (tag, index) => {
          const tagId = await this.updatePetaTag(tag, mode);
          handler.emitStatus({
            i18nKey: "tasks.updateDatas",
            progress: {
              all: tags.length,
              current: index + 1,
            },
            status: TaskStatusCode.PROGRESS,
          });
          return tagId;
        }, tags).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.COMPLETE,
        });
        // Tileの更新対象は、PetaTagIdsのみ。
        emitMainEvent(
          {
            type: EmitMainEventTargetType.WINDOW_NAMES,
            windowNames: ["board", "browser", "details"],
          },
          "updatePetaTags",
          {
            petaTagIds: tagIds.filter((tagId) => tagId !== undefined) as string[],
            petaFileIds: [],
          },
        );
        return true;
      },
      {},
      silent,
    );
  }
  async updatePetaFilesPetaTags(
    petaFileIds: string[],
    petaTagLikes: PetaTagLike[],
    mode: UpdateMode,
    silent = false,
  ) {
    const dbPetaTags = useDBPetaTags();
    return Tasks.spawn(
      "UpdatePetaFilesPetaTags",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.BEGIN,
        });
        await ppa(async (petaFileId, iIndex) => {
          await ppa(async (petaTagLike, tIndex) => {
            let petaTagId: string | undefined = undefined;
            if (petaTagLike.type === "id") {
              petaTagId = petaTagLike.id;
            } else if (petaTagLike.type === "name") {
              const petaTag = (await dbPetaTags.find({ name: petaTagLike.name }))[0];
              if (petaTag) {
                petaTagId = petaTag.id;
              } else {
                const newPetaTag = createPetaTag(petaTagLike.name);
                await dbPetaTags.insert(newPetaTag);
                petaTagId = newPetaTag.id;
              }
            } else if (petaTagLike.type === "petaTag") {
              petaTagId = petaTagLike.petaTag.id;
            }
            if (petaTagId === undefined) {
              throw new Error(`PetaTagLike is wrong: ${JSON.stringify(petaTagLike)}`);
            }
            await this.updatePetaFilePetaTag(createPetaFilePetaTag(petaFileId, petaTagId), mode);
            handler.emitStatus({
              i18nKey: "tasks.updateDatas",
              progress: {
                all: petaFileIds.length * petaTagLikes.length,
                current: iIndex * petaTagLikes.length + tIndex + 1,
              },
              status: TaskStatusCode.PROGRESS,
            });
          }, petaTagLikes).promise;
        }, petaFileIds).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.COMPLETE,
        });
        // Tileの更新対象はPetaFileIdsのみ。
        emitMainEvent({ type: EmitMainEventTargetType.ALL }, "updatePetaTags", {
          petaTagIds: [],
          petaFileIds,
        });
      },
      {},
      silent,
    );
  }
  async getPetaTagIdsByPetaFileIds(petaFileIds: string[]) {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const pipts = dbPetaFilesPetaTags
      .getAll()
      .filter((pipt) => petaFileIds.includes(pipt.petaFileId));
    const ids = Array.from(
      new Set(
        pipts.map((pipt) => {
          return pipt.petaTagId;
        }),
      ),
    );
    const petaTagIds = ids.filter((id) => {
      return (
        pipts.filter((pipt) => {
          return pipt.petaTagId === id;
        }).length === petaFileIds.length
      );
    });
    return petaTagIds;
  }
  async getPetaTagCount(petaTag: PetaTag) {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const petaFilesPetaTags = dbPetaFilesPetaTags.getAll();
    return petaFilesPetaTags.filter((pipt) => pipt.petaTagId === petaTag.id).length;
  }
  async getPetaTags() {
    const dbPetaTags = useDBPetaTags();
    return dbPetaTags.getAll();
  }
  private async updatePetaTag(petaTagLike: PetaTagLike, mode: UpdateMode) {
    const logger = useLogger();
    const dbPetaTags = useDBPetaTags();
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const log = logger.logMainChunk();
    log.log("##Update PetaTag");
    if (petaTagLike.type === "petaTag") {
      log.log("mode:", mode);
      log.log("tag:", minimizeID(petaTagLike.petaTag.id));
      if (mode === UpdateMode.REMOVE) {
        await dbPetaFilesPetaTags.remove({ petaTagId: petaTagLike.petaTag.id });
        await dbPetaTags.remove({ id: petaTagLike.petaTag.id });
      } else if (mode === UpdateMode.UPDATE) {
        await dbPetaTags.update({ id: petaTagLike.petaTag.id }, petaTagLike.petaTag);
      } else {
        await dbPetaTags.insert(petaTagLike.petaTag);
      }
      return petaTagLike.petaTag.id;
    } else if (petaTagLike.type === "id") {
      if (mode === UpdateMode.REMOVE) {
        await dbPetaFilesPetaTags.remove({ petaTagId: petaTagLike.id });
        await dbPetaTags.remove({ id: petaTagLike.id });
      } else {
        throw new Error(`Could not "${mode}" PetaTag by id`);
      }
      return petaTagLike.id;
    } else if (petaTagLike.type === "name") {
      if (mode === UpdateMode.REMOVE) {
        const petaTag = (await dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          await dbPetaFilesPetaTags.remove({ petaTagId: petaTag.id });
          await dbPetaTags.remove({ id: petaTag.id });
          return petaTag.id;
        }
        return undefined;
      } else if (mode === UpdateMode.UPDATE) {
        throw new Error(`Could not "${mode}" PetaTag by name`);
      } else {
        const petaTag = (await dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          return petaTag.id;
        }
        const newPetaTag = createPetaTag(petaTagLike.name);
        await dbPetaTags.insert(newPetaTag);
        return newPetaTag.id;
      }
    } else {
      throw new Error(`PetaTagLike is wrong: ${JSON.stringify(petaTagLike)}`);
    }
    return undefined;
  }
  private async updatePetaFilePetaTag(petaFilePetaTag: PetaFilePetaTag, mode: UpdateMode) {
    const logger = useLogger();
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const log = logger.logMainChunk();
    log.log("##Update PetaFilePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimizeID(petaFilePetaTag.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaFilesPetaTags.remove({ id: petaFilePetaTag.id });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaFilesPetaTags.update({ id: petaFilePetaTag.id }, petaFilePetaTag);
    } else {
      await dbPetaFilesPetaTags.insert(petaFilePetaTag);
    }
    return true;
  }
}
export const petaTagsControllerKey = createKey<PetaTagsController>("petaTagsController");
export const usePetaTagsController = createUseFunction(petaTagsControllerKey);
