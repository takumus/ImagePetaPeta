import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import * as Tasks from "@/mainProcess/tasks/task";
import { UNTAGGED_ID } from "@/commons/defines";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { ppa } from "@/commons/utils/pp";
import { TaskStatusCode } from "@/commons/api/interfaces/task";
import { GetPetaImageIdsParams } from "@/commons/datas/getPetaImageIdsParams";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
export class PetaDataPetaTags {
  constructor(private parent: PetaDatas) {}
  async updatePetaTags(tags: PetaTagLike[], mode: UpdateMode, silent = false) {
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
        this.parent.emitMainEvent("updatePetaTags", {
          petaTagIds: tagIds.filter((tagId) => tagId !== undefined) as string[],
          petaImageIds: [],
        });
        this.parent.emitMainEvent("updatePetaTagCounts", await this.getPetaTagCounts());
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
              const petaTag = (
                await this.parent.datas.dbPetaTags.find({ name: petaTagLike.name })
              )[0];
              if (petaTag) {
                petaTagId = petaTag.id;
              } else {
                const newPetaTag = createPetaTag(petaTagLike.name);
                await this.parent.datas.dbPetaTags.insert(newPetaTag);
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
        this.parent.emitMainEvent("updatePetaTags", {
          petaTagIds: [],
          petaImageIds,
        });
        this.parent.emitMainEvent(
          "updatePetaTagCounts",
          await this.parent.petaTags.getPetaTagCounts(),
        );
      },
      {},
      silent,
    );
  }
  async getPetaImageIds(params: GetPetaImageIdsParams) {
    // all
    if (params.type === "all") {
      const ids = (await this.parent.datas.dbPetaImages.find({})).map((pi) => pi.id);
      return ids;
    }
    // untagged
    if (params.type === "untagged") {
      const taggedIds = Array.from(
        new Set(
          (await this.parent.datas.dbPetaImagesPetaTags.find({})).map((pipt) => {
            return pipt.petaImageId;
          }),
        ),
      );
      const ids = (
        await this.parent.datas.dbPetaImages.find({
          id: {
            $nin: taggedIds,
          },
        })
      ).map((pi) => pi.id);
      return ids;
    }
    // filter by ids
    if (params.type === "petaTag") {
      const pipts = await this.parent.datas.dbPetaImagesPetaTags.find({
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
    // const log = this.parent.mainLogger.logChunk();
    let pipts: PetaImagePetaTag[] = [];
    pipts =
      petaImageIds.length === 1
        ? await this.parent.datas.dbPetaImagesPetaTags.find({ petaImageId: petaImageIds[0] })
        : (await this.parent.datas.dbPetaImagesPetaTags.find()).filter((pipt) => {
            return petaImageIds.includes(pipt.petaImageId);
          });
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
    const petaTags = await this.parent.datas.dbPetaTags.find({});
    const taggedIds = Array.from(
      new Set(
        (await this.parent.datas.dbPetaImagesPetaTags.find({})).map((pipt) => {
          return pipt.petaImageId;
        }),
      ),
    );
    const count = await this.parent.datas.dbPetaImages.count({
      id: {
        $nin: taggedIds,
      },
    });
    const petaTagCounts: { [id: string]: number } = {};
    await ppa(async (petaTag) => {
      petaTagCounts[petaTag.id] = await this.parent.datas.dbPetaImagesPetaTags.count({
        petaTagId: petaTag.id,
      });
    }, petaTags).promise;
    petaTagCounts[UNTAGGED_ID] = count;
    return petaTagCounts;
  }
  async getPetaTags() {
    // const log = this.parent.mainLogger.logChunk();
    const petaTags = await this.parent.datas.dbPetaTags.find({});
    return [
      {
        index: 0,
        id: UNTAGGED_ID,
        name: this.parent.datas.i18n.global.t("browser.untagged"),
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
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaTag");
    if (petaTagLike.type === "petaTag") {
      log.log("mode:", mode);
      log.log("tag:", minimId(petaTagLike.petaTag.id));
      if (mode === UpdateMode.REMOVE) {
        await this.parent.datas.dbPetaImagesPetaTags.remove({ petaTagId: petaTagLike.petaTag.id });
        await this.parent.datas.dbPetaTags.remove({ id: petaTagLike.petaTag.id });
      } else if (mode === UpdateMode.UPDATE) {
        await this.parent.datas.dbPetaTags.update(
          { id: petaTagLike.petaTag.id },
          petaTagLike.petaTag,
        );
      } else {
        await this.parent.datas.dbPetaTags.insert(petaTagLike.petaTag);
      }
      return petaTagLike.petaTag.id;
    } else if (petaTagLike.type === "id") {
      if (mode === UpdateMode.REMOVE) {
        await this.parent.datas.dbPetaImagesPetaTags.remove({ petaTagId: petaTagLike.id });
        await this.parent.datas.dbPetaTags.remove({ id: petaTagLike.id });
      } else {
        throw new Error(`Could not "${mode}" PetaTag by id`);
      }
      return petaTagLike.id;
    } else if (petaTagLike.type === "name") {
      if (mode === UpdateMode.REMOVE) {
        const petaTag = (await this.parent.datas.dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          await this.parent.datas.dbPetaImagesPetaTags.remove({ petaTagId: petaTag.id });
          await this.parent.datas.dbPetaTags.remove({ id: petaTag.id });
          return petaTag.id;
        }
        return undefined;
      } else if (mode === UpdateMode.UPDATE) {
        throw new Error(`Could not "${mode}" PetaTag by name`);
      } else {
        const petaTag = (await this.parent.datas.dbPetaTags.find({ name: petaTagLike.name }))[0];
        if (petaTag) {
          return petaTag.id;
        }
        const newPetaTag = createPetaTag(petaTagLike.name);
        await this.parent.datas.dbPetaTags.insert(newPetaTag);
        return newPetaTag.id;
      }
    } else {
      throw new Error(`PetaTagLike is wrong: ${JSON.stringify(petaTagLike)}`);
    }
    return undefined;
  }
  private async updatePetaImagePetaTag(petaImagePetaTag: PetaImagePetaTag, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaImagePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaImagePetaTag.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaImagesPetaTags.remove({ id: petaImagePetaTag.id });
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaImagesPetaTags.update(
        { id: petaImagePetaTag.id },
        petaImagePetaTag,
      );
    } else {
      await this.parent.datas.dbPetaImagesPetaTags.insert(petaImagePetaTag);
    }
    return true;
  }
}
