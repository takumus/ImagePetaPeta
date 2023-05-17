import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { UpdateMode } from "@/commons/datas/updateMode";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBS } from "@/main/provides/databases";

const ROOT = "./_test/scenario/petaFilesPetaTags";
describe("petaFilesPetaTags", () => {
  beforeAll(async () => {
    try {
      rmdirSync(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    try {
      rmdirSync(resolve(ROOT, h.meta.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.meta.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.meta.name));
  });
  async function addPetaTag() {
    const pfc = usePetaFilesController();
    const pfptc = usePetaFilesPetaTagsController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [
        { name: "bee", note: "", path: resolve("./test/sampleDatas/bee.jpg") },
        { name: "flower", note: "", path: resolve("./test/sampleDatas/flower.jpg") },
      ],
    });
    const taggedPetaFile = petaFiles[0];
    const untaggedPetaFile = petaFiles[1];
    const petaTagsController = usePetaTagsController();
    await petaTagsController.updateMultiple(
      [
        {
          type: "name",
          name: "A",
        },
      ],
      UpdateMode.INSERT,
    );
    const petaTag = (await petaTagsController.getPetaTags())[0];
    await pfptc.updatePetaFilesPetaTags(
      [taggedPetaFile.id],
      [
        {
          type: "id",
          id: petaTag.id,
        },
      ],
      UpdateMode.INSERT,
    );
    const taggedPetaFileIDs = await pfptc.getPetaFileIds({
      type: "petaTag",
      petaTagIds: [petaTag.id],
    });
    expect(taggedPetaFileIDs.length, "tagged.length").toBe(1);
    expect(taggedPetaFileIDs[0], "tagged").toBe(taggedPetaFile.id);
    const untaggedPetaFileIDs = await pfptc.getPetaFileIds({
      type: "untagged",
    });
    expect(untaggedPetaFileIDs.length, "untagged.length").toBe(1);
    expect(untaggedPetaFileIDs[0], "untagged").toBe(untaggedPetaFile.id);
    return {
      taggedPetaFile,
      petaTag,
    };
  }
  test("addPetaTagToPetaFileAndFind", async (f) => {
    await addPetaTag();
    await useDBS().waitUntilKillable();
  });
  test("removePetaFilesPetaTags.byRemovePetaFile", async (f) => {
    const result = await addPetaTag();
    const pfc = usePetaFilesController();
    const pfptc = usePetaFilesPetaTagsController();
    await pfc.updateMultiple([result.taggedPetaFile], UpdateMode.REMOVE);
    expect(
      (
        await pfptc.getPetaFileIds({
          type: "petaTag",
          petaTagIds: [result.petaTag.id],
        })
      ).length,
    ).toBe(0);
    await useDBS().waitUntilKillable();
  });
  test("removePetaFilesPetaTags.byRemovePetaTag", async (f) => {
    const result = await addPetaTag();
    const ptc = usePetaTagsController();
    const pfptc = usePetaFilesPetaTagsController();
    await ptc.updateMultiple(
      [
        {
          type: "petaTag",
          petaTag: result.petaTag,
        },
      ],
      UpdateMode.REMOVE,
    );
    expect(
      (
        await pfptc.getPetaFileIds({
          type: "petaTag",
          petaTagIds: [result.petaTag.id],
        })
      ).length,
    ).toBe(0);
    await useDBS().waitUntilKillable();
  });
  test("removePetaFilesPetaTags.byPetaFilesPetaTags", async (f) => {
    const result = await addPetaTag();
    const ptc = usePetaTagsController();
    const pfptc = usePetaFilesPetaTagsController();
    await pfptc.updatePetaFilesPetaTags(
      [result.taggedPetaFile.id],
      [
        {
          type: "petaTag",
          petaTag: result.petaTag,
        },
      ],
      UpdateMode.REMOVE,
    );
    expect(
      (
        await pfptc.getPetaFileIds({
          type: "petaTag",
          petaTagIds: [result.petaTag.id],
        })
      ).length,
    ).toBe(0);
    await useDBS().waitUntilKillable();
  });
});
