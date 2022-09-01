import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { minimId } from "@/commons/utils/utils";
import { PetaDatas } from "@/mainProcess/petaDatas";
import * as Tasks from "@/mainProcess/tasks/task";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { UNTAGGED_ID } from "@/commons/defines";
import { createPetaImagePetaTag, PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
export class PetaDataPetaTags {
  constructor(private parent: PetaDatas) {}
  private async updatePetaTag(tag: PetaTag, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(tag.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaImagesPetaTags.remove({ petaTagId: tag.id });
      await this.parent.datas.dbPetaTags.remove({ id: tag.id });
      log.log("removed");
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaTags.update({ id: tag.id }, tag);
      log.log("updated");
    } else {
      await this.parent.datas.dbPetaTags.insert(tag);
      log.log("inserted");
    }
    return true;
  }
  async updatePetaTags(tags: PetaTag[], mode: UpdateMode) {
    await promiseSerial((tag) => this.updatePetaTag(tag, mode), tags).promise;
    // Tileの更新対象は、PetaTagIdsのみ。
    this.parent.emitMainEvent("updatePetaTags", {
      petaTagIds: tags.map((tag) => tag.id),
      petaImageIds: [],
    });
    this.parent.emitMainEvent("updatePetaTagCounts", await this.getPetaTagCounts());
    return true;
  }
  async updatePetaImagesPetaTags(petaImageIds: string[], petaTagIds: string[], mode: UpdateMode) {
    return Tasks.spawn(
      "UpdatePetaImagesPetaTags",
      async (handler) => {
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: "begin",
          log: [],
        });
        await promiseSerial(async (petaImageId, iIndex) => {
          await promiseSerial(async (petaTagId, tIndex) => {
            await this.updatePetaImagePetaTag(createPetaImagePetaTag(petaImageId, petaTagId), mode);
            handler.emitStatus({
              i18nKey: "tasks.updateDatas",
              progress: {
                all: petaImageIds.length * petaTagIds.length,
                current: iIndex * petaTagIds.length + tIndex + 1,
              },
              status: "progress",
              log: [petaTagId, petaImageId],
            });
          }, petaTagIds).promise;
        }, petaImageIds).promise;
        handler.emitStatus({
          i18nKey: "tasks.updateDatas",
          status: "complete",
          log: [],
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
      false,
    );
  }
  private async updatePetaImagePetaTag(petaImagePetaTag: PetaImagePetaTag, mode: UpdateMode) {
    const log = this.parent.mainLogger.logChunk();
    log.log("##Update PetaImagePetaTag");
    log.log("mode:", mode);
    log.log("tag:", minimId(petaImagePetaTag.id));
    if (mode === UpdateMode.REMOVE) {
      await this.parent.datas.dbPetaImagesPetaTags.remove({ id: petaImagePetaTag.id });
      log.log("removed");
    } else if (mode === UpdateMode.UPDATE) {
      await this.parent.datas.dbPetaImagesPetaTags.update(
        { id: petaImagePetaTag.id },
        petaImagePetaTag,
      );
      log.log("updated");
    } else {
      await this.parent.datas.dbPetaImagesPetaTags.insert(petaImagePetaTag);
      log.log("inserted");
    }
    return true;
  }
  async getPetaImageIdsByPetaTagIds(petaTagIds: string[] | undefined) {
    const log = this.parent.mainLogger.logChunk();
    // all
    if (!petaTagIds) {
      log.log("type: all");
      const ids = (await this.parent.datas.dbPetaImages.find({})).map((pi) => pi.id);
      log.log("return:", ids.length);
      return ids;
    }
    // untagged
    if (petaTagIds.length === 0) {
      log.log("type: untagged");
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
    log.log("type: filter");
    const pipts = await this.parent.datas.dbPetaImagesPetaTags.find({
      $or: petaTagIds.map((id) => {
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
        }).length === petaTagIds.length
      );
    });
    return ids;
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
    await promiseSerial(async (petaTag) => {
      petaTagCounts[petaTag.id] = await this.parent.datas.dbPetaImagesPetaTags.count({
        petaTagId: petaTag.id,
      });
    }, petaTags).promise;
    petaTagCounts[UNTAGGED_ID] = count;
    return petaTagCounts;
  }
  async getPetaTags(untaggedName: string) {
    // const log = this.parent.mainLogger.logChunk();
    const petaTags = await this.parent.datas.dbPetaTags.find({});
    return [
      {
        index: 0,
        id: UNTAGGED_ID,
        name: untaggedName,
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
}