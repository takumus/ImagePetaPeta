import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, readFileSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { UpdateMode } from "@/commons/datas/updateMode";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useDBS } from "@/main/provides/databases";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { realESRGAN } from "@/main/utils/realESRGAN";

const ROOT = "./_test/scenario/petaFilesController";
describe("petaFilesController", () => {
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
  test("importFilesFromFileInfos(file)", async () => {
    const pfc = usePetaFilesController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [{ name: "test", note: "", path: resolve("./test/sampleDatas/bee.jpg") }],
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
      fileInfos: [{ name: "test", note: "", path: resolve("./test/sampleDatas") }],
      extract: true,
    });
    expect(petaFiles.length, "petaFiles.length").toBe(7);
    await useDBS().waitUntilKillable();
  });
  test("updatePetaFiles", async () => {
    const pfc = usePetaFilesController();
    const petaFiles = await pfc.importFilesFromFileInfos({
      fileInfos: [{ name: "image", note: "", path: resolve("./test/sampleDatas") }],
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
    expect(petaFiles.length, "petaFiles.length").toBe(7);
    Object.values(await pfc.getAll()).forEach((petaFile) => {
      expect(petaFile?.name, "name").toBe("newImage");
    });
    await useDBS().waitUntilKillable();
  });
  // test("realESRGAN", async () => {
  //   const pfc = usePetaFilesController();
  //   const petaFiles = await pfc.importFilesFromFileInfos({
  //     fileInfos: [
  //       { name: "image", note: "", path: resolve("./test/sampleDatas/lowResDog.jpg") },
  //     ],
  //   });
  //   const newPetaFile = (await realESRGAN(petaFiles, "realesrgan-x4plus"))[0];
  //   expect(newPetaFile.metadata.width, "upconverted width").toBe(128);
  //   await useDBS().waitUntilKillable();
  // });
});
