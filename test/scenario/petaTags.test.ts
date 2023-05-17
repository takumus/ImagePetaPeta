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
});
