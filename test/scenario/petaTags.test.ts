import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { UpdateMode } from "@/commons/datas/updateMode";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBS } from "@/main/provides/databases";

const ROOT = "./_test/scenario/petaTags";
describe("petaTags", () => {
  beforeAll(async () => {
    rmSync(resolve(ROOT), { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    rmSync(resolve(ROOT, h.meta.name), { recursive: true, force: true });
    mkdirSync(resolve(ROOT, h.meta.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.meta.name));
  });
  test("addPetaTag", async () => {
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
    const petaTags = await petaTagsController.getPetaTags();
    expect(petaTags[0].name, "addPetaTag").toBe("A");
    await useDBS().waitUntilKillable();
  });
  test("modifyPetaTagToPetaFileAndFind", async (f) => {
    const pfc = usePetaFilesController();
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
    await petaTagsController.updatePetaFilesPetaTags(
      [taggedPetaFile.id],
      [
        {
          type: "id",
          id: petaTag.id,
        },
      ],
      UpdateMode.INSERT,
    );
    const taggedPetaFileIDs = await pfc.getPetaFileIds({
      type: "petaTag",
      petaTagIds: [petaTag.id],
    });
    expect(taggedPetaFileIDs.length, "tagged.length").toBe(1);
    expect(taggedPetaFileIDs[0], "tagged").toBe(taggedPetaFile.id);
    const untaggedPetaFileIDs = await pfc.getPetaFileIds({
      type: "untagged",
    });
    expect(untaggedPetaFileIDs.length, "untagged.length").toBe(1);
    expect(untaggedPetaFileIDs[0], "untagged").toBe(untaggedPetaFile.id);
    const taggedPetaTagIDs = await petaTagsController.getPetaTagIdsByPetaFileIds(taggedPetaFileIDs);
    expect(taggedPetaTagIDs.length).toBe(1);
    expect(taggedPetaTagIDs[0]).toBe(petaTag.id);
    await petaTagsController.updatePetaFilesPetaTags(
      [taggedPetaFile.id],
      [
        {
          type: "id",
          id: petaTag.id,
        },
      ],
      UpdateMode.REMOVE,
    );
    const untaggedPetaFileIDs2 = await pfc.getPetaFileIds({
      type: "untagged",
    });
    expect(untaggedPetaFileIDs2.length, "all untagged.length").toBe(2);
    await useDBS().waitUntilKillable();
  });
});