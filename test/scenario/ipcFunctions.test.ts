import { mkdirSync, readFileSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { initDummyElectron } from "./initDummyElectron";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { ipcFunctions } from "@/main/ipcFunctions";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useDBS } from "@/main/provides/databases";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";

const ROOT = "./_test/scenario/ipcFunctions";
describe("ipcFunctions", () => {
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
      rmdirSync(resolve(ROOT, h.task.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.task.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.task.name));
  });
  test("importFiles.filePath", async () => {
    const result = await ipcFunctions.importFiles({} as any, [
      [
        {
          type: "filePath",
          filePath: resolve("./test/sampleDatas/bee.jpg"),
        },
      ],
    ]);
    const petaFile = (await usePetaFilesController().getPetaFile(result[0]))!;
    expect(petaFile).toBeTruthy();
    expect(
      readFileSync(getPetaFilePath.fromPetaFile(petaFile).original).byteLength,
    ).toBeGreaterThan(600000);
    await useDBS().waitUntilKillable();
  });
  test("importFiles.withParams", async () => {
    const result = await ipcFunctions.importFiles({} as any, [
      [
        {
          type: "filePath",
          filePath: resolve("./test/sampleDatas/bee.jpg"),
          additionalData: {
            name: "bee",
            note: "cute",
          },
        },
      ],
    ]);
    const petaFile = (await usePetaFilesController().getPetaFile(result[0]))!;
    expect(petaFile.name).toBe("bee");
    expect(petaFile.note).toBe("cute");
    await useDBS().waitUntilKillable();
  });
  test("getPetaBoards.empty", async (h) => {
    const board = Object.values(await ipcFunctions.getPetaBoards({} as any))[0];
    expect(board).toBeTruthy();
    await useDBS().waitUntilKillable();
    await initDummyElectron(resolve(ROOT, h.task.name));
    const board2 = Object.values(await ipcFunctions.getPetaBoards({} as any))[0];
    expect(board2.id).toBe(board.id);
    await useDBS().waitUntilKillable();
  });
});
