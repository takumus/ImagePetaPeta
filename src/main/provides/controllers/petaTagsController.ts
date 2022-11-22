import { GetPetaImageIdsParams } from "@/commons/datas/getPetaImageIdsParams";
import { PetaImagePetaTag, createPetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { createPetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { TaskStatusCode } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { UNTAGGED_ID } from "@/commons/defines";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBPetaImages, useDBPetaImagesPetaTags, useDBPetaTags } from "@/main/provides/databases";
import { useEmitMainEvent } from "@/main/provides/utils/emitMainEvent";
import { useI18n } from "@/main/provides/utils/i18n";
import { useLogger } from "@/main/provides/utils/logger";
import * as Tasks from "@/main/tasks/task";

export class PetaTagsController {
  async updateMultiple(tags: PetaTagLike[], mode: UpdateMode, silent = false) {
    const emit = useEmitMainEvent();
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
        emit("updatePetaTags", {
          petaTagIds: tagIds.filter((tagId) => tagId !== undefined) as string[],
          petaImageIds: [],
        });
        emit("updatePetaTagCounts", await this.getPetaTagCounts());
        return true;
      },
      {},
      silent,
    );
  }
  async updatePetaImagesPetaTags(
    petaImageIds: string[],
    petaTagLikes: PetaTagLike[],
    mode: UpdateMode,
    silent = false,
  ) {
    const petaTagsController = usePetaTagsController();
    const dbPetaTags = useDBPetaTags();
    const emit = useEmitMainEvent();
    return Tasks.spawn(
      "UpdatePetaImagesPetaTags",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.BEGIN,
        });
        await ppa(async (petaImageId, iIndex) => {
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
            await this.updatePetaImagePetaTag(createPetaImagePetaTag(petaImageId, petaTagId), mode);
            handler.emitStatus({
              i18nKey: "tasks.updateDatas",
              progress: {
                all: petaImageIds.length * petaTagLikes.length,
                current: iIndex * petaTagLikes.length + tIndex + 1,
              },
              status: TaskStatusCode.PROGRESS,
            });
          }, petaTagLikes).promise;
        }, petaImageIds).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: TaskStatusCode.COMPLETE,
        });
        // Tileの更新対象はPetaImageIdsのみ。
        emit("updatePetaTags", {
          petaTagIds: [],
          petaImageIds,
        });
        emit("updatePetaTagCounts", await petaTagsController.getPetaTagCounts());
      },
      {},
      silent,
    );
  }
  async getPetaImageIds(params: GetPetaImageIdsParams) {
    const dbPetaImages = useDBPetaImages();
    const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
    // all
    if (params.type === "all") {
      const ids = dbPetaImages.getAll().map((pi) => pi.id);
      return ids;
    }
    // untagged
    if (params.type === "untagged") {
      const taggedIds = Array.from(
        new Set(
          dbPetaImagesPetaTags.getAll().map((pipt) => {
            return pipt.petaImageId;
          }),
        ),
      );
      const ids = (
        await dbPetaImages.find({
          id: {
            $nin: taggedIds,
          },
        })
      ).map((pi) => pi.id);
      return ids;
    }
    // filter by ids
    if (params.type === "petaTag") {
      const pipts = await dbPetaImagesPetaTags.find({
        $or: params.petaTagIds.map((id) => {
          return {
            petaTagId: id,
          };
        }),
      });
      const ids = Array.from(
        new Set(
          pipts.map((pipt) => {
            return pipt.petaImageId;
          }),
        ),
      ).filter((id) => {
        return (
          pipts.filter((pipt) => {
            return pipt.petaImageId === id;
          }).length === params.petaTagIds.length
        );
      });
      return ids;
    }
    return [];
  }
  async getPetaTagIdsByPetaImageIds(petaImageIds: string[]) {
    const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
    const pipts = dbPetaImagesPetaTags
      .getAll()
      .filter((pipt) => petaImageIds.includes(pipt.petaImageId));
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
        }).length === petaImageIds.length
      );
    });
    return petaTagIds;
  }
  async getPetaTagCounts() {
    const dbPetaTags = useDBPetaTags();
    const dbPetaImages = useDBPetaImages();
    const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
    const petaTags = dbPetaTags.getAll();
    const petaImagesPetaTags = dbPetaImagesPetaTags.getAll();
    const taggedIds = Array.from(
      new Set(
        petaImagesPetaTags.map((pipt) => {
          return pipt.petaImageId;
        }),
      ),
    );
    const count = await dbPetaImages.count({
      id: {
        $nin: taggedIds,
      },
    });
    const petaTagCounts = petaTags.reduce((counts, petaTag) => {
      counts[petaTag.id] = petaImagesPetaTags.filter(
        (pipt) => pipt.petaTagId === petaTag.id,
      ).length;
      return counts;
    }, {} as { [id: string]: number });
    petaTagCounts[UNTAGGED_ID] = count;
    return petaTagCounts;
  }
  async getPetaTags() {
    const dbPetaTags = useDBPetaTags();
    const i18n = useI18n();
    const petaTags = dbPetaTags.getAll();
    return [
      {
        index: 0,
        id: UNTAGGED_ID,
        name: i18n.global.t("browser.untagged"),
      },
      ...petaTags.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        } else {
          return 1;
        }
      }),
    ];
  }
  private async updatePetaTag(petaTagLike: PetaTagLike, mode: UpdateMode) {
    const logger = useLogger();
    const dbPetaTags = useDBPetaTags();
    const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
    const log = logger.logMainChunk();
    log.log("##Update PetaTag");
    if (petaTagLike.type === "petaTag") {
      log.log("mode:", mode);
      log.log("tag:", minimizeID(petaTagLike.petaTag.id));
      if (mode === UpdateMode.REMOVE) {
        await dbPetaImagesPetaTags.remove({ petaTagId: petaTagLike.petaTag.id });
        await dbPetaTags.remove({ id: petaTagLike.petaTag.id });
      } else if (mode === UpdateMode.UPDATE) {
        await dbPetaTags.update({ id: petaTagLike.petaTag.id }, petaTagLike.petaTag);
      } else {
        await dbPetaTags.insert(petaTagLike.petaTag);
      }
      return petaTagLike.petaTag.id;
    } else if (petaTagLike.type === "id") {
      if (mode === UpdateMode.REMOVE) {
        await dbPetaImagesPetaTags.remove({ petaTagId: petaTagLike.id });
        await dbPetaTags.remove({ id: petaTagLike.id });
      } else {
        throw new Error(`Could not "${mode}" PetaTag by id`);
      }
      return petaTagLike.id;
    } else if (petaTagLike.type === "name") {
      if (mode === UpdateMode.REMOVE) {
        const petaTag = (await dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          await dbPetaImagesPetaTags.remove({ petaTagId: petaTag.id });
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
  private async updatePetaImagePetaTag(petaImagePetaTag: PetaImagePetaTag, mode: UpdateMode) {
    const logger = useLogger();
    const dbPetaImagesPetaTags = useDBPetaImagesPetaTags();
    const log = logger.logMainChunk();
    log.log("##Update PetaImagePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimizeID(petaImagePetaTag.id));
    if (mode === UpdateMode.REMOVE) {
      await dbPetaImagesPetaTags.remove({ id: petaImagePetaTag.id });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaImagesPetaTags.update({ id: petaImagePetaTag.id }, petaImagePetaTag);
    } else {
      await dbPetaImagesPetaTags.insert(petaImagePetaTag);
    }
    return true;
  }
}
export const petaTagsControllerKey = createKey<PetaTagsController>("petaTagsController");
export const usePetaTagsController = createUseFunction(petaTagsControllerKey);
