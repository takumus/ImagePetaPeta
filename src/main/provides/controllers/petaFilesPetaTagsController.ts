import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { createPetaFilePetaTag, PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { UpdateMode } from "@/commons/datas/updateMode";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useDBPetaFiles, useDBPetaFilesPetaTags, useDBPetaTags } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { useWindows } from "@/main/provides/windows";

export class PetaFilesPetaTagsController {
  async updatePetaFilesPetaTags(
    petaFileIds: string[],
    petaTagLikes: PetaTagLike[],
    mode: UpdateMode,
    silent = false,
  ) {
    const dbPetaTags = useDBPetaTags();
    const tasks = useTasks();
    const windows = useWindows();
    const task = tasks.spawn("UpdatePetaFilesPetaTags", silent);
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "begin",
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
        task.emitStatus({
          i18nKey: "tasks.updateDatas",
          progress: {
            all: petaFileIds.length * petaTagLikes.length,
            current: iIndex * petaTagLikes.length + tIndex + 1,
          },
          status: "progress",
        });
      }, petaTagLikes).promise;
    }, petaFileIds).promise;
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      status: "complete",
    });
    // Tileの更新対象はPetaFileIdsのみ。
    windows.emit.petaTags.update(
      { type: "all" },
      {
        petaTagIds: [],
        petaFileIds,
      },
    );
  }
  async getPetaTagCount(petaTag: PetaTag) {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const petaFilesPetaTags = dbPetaFilesPetaTags.getAll();
    return petaFilesPetaTags.filter((pipt) => pipt.petaTagId === petaTag.id).length;
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
  async getPetaTagIdsByPetaFileIds2(petaFileIds: string[]) {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const res: { [pfid: string]: string[] } = {};
    await ppa(
      async (pfid, i) => {
        res[pfid] = (await dbPetaFilesPetaTags.find({ petaFileId: pfid })).map(
          (pipt) => pipt.petaTagId,
        );
        await new Promise(setImmediate);
      },
      petaFileIds,
      CPU_LENGTH,
    ).promise;
    return res;
  }
  async getPetaFileIds(params: GetPetaFileIdsParams) {
    const dbPetaFiles = useDBPetaFiles();
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    // all
    if (params.type === "all") {
      const ids = dbPetaFiles.getAll().map((pi) => pi.id);
      return ids;
    }
    // untagged
    if (params.type === "untagged") {
      const taggedIds = Array.from(
        new Set(
          dbPetaFilesPetaTags.getAll().map((pipt) => {
            return pipt.petaFileId;
          }),
        ),
      );
      const ids = (
        await dbPetaFiles.find({
          id: {
            $nin: taggedIds,
          },
        })
      ).map((pi) => pi.id);
      return ids;
    }
    // filter by ids
    if (params.type === "petaTag") {
      const pipts = await dbPetaFilesPetaTags.find({
        $or: params.petaTagIds.map((id) => {
          return {
            petaTagId: id,
          };
        }),
      });
      const ids = Array.from(
        new Set(
          pipts.map((pipt) => {
            return pipt.petaFileId;
          }),
        ),
      ).filter((id) => {
        return (
          pipts.filter((pipt) => {
            return pipt.petaFileId === id;
          }).length === params.petaTagIds.length
        );
      });
      return ids;
    }
    return [];
  }
  async remove(id: string, by: "petaTagId" | "petaFileId" | "id") {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    await dbPetaFilesPetaTags.remove({ [by]: id });
  }
  private async updatePetaFilePetaTag(petaFilePetaTag: PetaFilePetaTag, mode: UpdateMode) {
    const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
    const log = useLogger().logChunk("PetaFilesPetaTagsController.updatePetaFilePetaTag");
    log.debug("mode:", mode);
    log.debug("tag:", minimizeID(petaFilePetaTag.id));
    if (mode === "remove") {
      await dbPetaFilesPetaTags.remove({ id: petaFilePetaTag.id });
    } else if (mode === "update") {
      await dbPetaFilesPetaTags.update({ id: petaFilePetaTag.id }, petaFilePetaTag);
    } else {
      await dbPetaFilesPetaTags.insert(petaFilePetaTag);
    }
    return true;
  }
  public getAll() {
    const dbPetaFiles = useDBPetaFilesPetaTags();
    return dbPetaFiles.getAll();
  }
}
export const petaFilesPetaTagsControllerKey = createKey<PetaFilesPetaTagsController>(
  "petaFilesPetaTagsController",
);
export const usePetaFilesPetaTagsController = createUseFunction(petaFilesPetaTagsControllerKey);
