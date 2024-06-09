import { createPetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { UpdateMode } from "@/commons/datas/updateMode";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { useDBPetaTags } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class PetaTagsController {
  async updateMultiple(tags: PetaTagLike[], mode: UpdateMode, silent = false) {
    const tasks = useTasks();
    const windows = useWindows();
    const task = tasks.spawn("UpdatePetaTags", silent);
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "begin",
    });
    const tagIds = await ppa(async (tag, index) => {
      const tagId = await this.update(tag, mode);
      task.emitStatus({
        i18nKey: "tasks.updateDatas",
        progress: {
          all: tags.length,
          current: index + 1,
        },
        status: "progress",
      });
      return tagId;
    }, tags).promise;
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "complete",
    });
    // Tileの更新対象は、PetaTagIdsのみ。
    windows.emitMainEvent(
      {
        type: "windowNames",
        windowNames: ["board", "browser", "details"],
      },
      "common",
      "updatePetaTags",
      {
        petaTagIds: tagIds.filter((tagId) => tagId !== undefined) as string[],
        petaFileIds: [],
      },
    );
    return true;
  }
  async getAll() {
    const dbPetaTags = useDBPetaTags();
    return dbPetaTags.getAll();
  }
  private async update(petaTagLike: PetaTagLike, mode: UpdateMode) {
    const dbPetaTags = useDBPetaTags();
    const petaFilesPetaTags = usePetaFilesPetaTagsController();
    const log = useLogger().logMainChunk("PetaTagsController.update");
    if (petaTagLike.type === "petaTag") {
      log.debug("mode:", mode);
      log.debug("tag:", minimizeID(petaTagLike.petaTag.id));
      if (mode === "remove") {
        await petaFilesPetaTags.remove(petaTagLike.petaTag.id, "petaTagId");
        await dbPetaTags.remove({ id: petaTagLike.petaTag.id });
      } else if (mode === "update") {
        await dbPetaTags.update({ id: petaTagLike.petaTag.id }, petaTagLike.petaTag);
      } else {
        await dbPetaTags.insert(petaTagLike.petaTag);
      }
      return petaTagLike.petaTag.id;
    } else if (petaTagLike.type === "id") {
      if (mode === "remove") {
        await petaFilesPetaTags.remove(petaTagLike.id, "petaTagId");
        await dbPetaTags.remove({ id: petaTagLike.id });
      } else {
        throw new Error(`Could not "${mode}" PetaTag by id`);
      }
      return petaTagLike.id;
    } else if (petaTagLike.type === "name") {
      if (mode === "remove") {
        const petaTag = (await dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          await petaFilesPetaTags.remove(petaTag.id, "petaTagId");
          await dbPetaTags.remove({ id: petaTag.id });
          return petaTag.id;
        }
        return undefined;
      } else if (mode === "update") {
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
  }
}
export const petaTagsControllerKey = createKey<PetaTagsController>("petaTagsController");
export const usePetaTagsController = createUseFunction(petaTagsControllerKey);
