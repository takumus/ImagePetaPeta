import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { initDummyElectron } from "./initDummyElectron";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBS } from "@/main/provides/databases";

const ROOT = "./_test/scenario/petaTags";
describe("petaTags", () => {
  beforeAll(async () => {
    try {
      await rm(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    try {
      await rm(resolve(ROOT, h.task.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.task.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.task.name));
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
      "insert",
    );
    const petaTags = await petaTagsController.getAll();
    expect(petaTags[0].name, "addPetaTag").toBe("A");
    await useDBS().waitUntilKillable();
  });
});
