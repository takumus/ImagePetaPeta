import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { UpdateMode } from "@/commons/datas/updateMode";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useDBS } from "@/main/provides/databases";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";

const ROOT = "./_test/app/petaFilesController";
describe("petaFilesController", () => {
  beforeAll(async () => {
    rmSync(resolve(ROOT), { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    rmSync(resolve(ROOT, h.meta.name), { recursive: true, force: true });
    mkdirSync(resolve(ROOT, h.meta.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.meta.name));
  });
  test("importFilesFromFileInfos(file)", async () => {
    const pfc = usePetaFilesController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [{ name: "test", note: "", path: resolve("./test/app/sampleDatas/bee.jpg") }],
    });
    expect(petaFiles.length, "petaFiles.length").toBe(1);
    const petaFile = petaFiles[0];
    const filePaths = getPetaFilePath.fromPetaFile(petaFile);
    const original = readFileSync(filePaths.original);
    const thumbnail = readFileSync(filePaths.thumbnail);
    expect(original.byteLength, "original.byteLength").toBeGreaterThan(600000);
    expect(thumbnail.length, "thumbnail.byteLength").toBeGreaterThan(20000);
    await useDBS().waitUntilKillable();
  });
  test("importFilesFromFileInfos(directory)", async () => {
    const pfc = usePetaFilesController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [{ name: "test", note: "", path: resolve("./test/app/sampleDatas") }],
      extract: true,
    });
    expect(petaFiles.length, "petaFiles.length").toBe(4);
    await useDBS().waitUntilKillable();
  });
  test("updatePetaFiles", async () => {
    const pfc = usePetaFilesController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [{ name: "image", note: "", path: resolve("./test/app/sampleDatas") }],
      extract: true,
    });
    await pfc.updateMultiple(
      petaFiles.map((petaFile) => {
        return {
          ...petaFile,
          name: "newImage",
        };
      }),
      UpdateMode.UPDATE,
    );
    expect(petaFiles.length, "petaFiles.length").toBe(4);
    Object.values(await pfc.getAll()).forEach((petaFile) => {
      expect(petaFile?.name, "name").toBe("newImage");
    });
    await useDBS().waitUntilKillable();
  });
});
