import { mkdirSync, readFileSync, rmdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { initDummyElectron } from "./initDummyElectron";
import { fileTypeFromStream } from "file-type";
import deepcopy from "lodash.clonedeep";
import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { UpdateMode } from "@/commons/datas/updateMode";
import { ppa } from "@/commons/utils/pp";

import { createFileInfo } from "@/main/provides/controllers/petaFilesController/createFileInfo";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useDBS } from "@/main/provides/databases";
import { useFileImporter } from "@/main/provides/fileImporter";
import { fileSHA256 } from "@/main/utils/fileSHA256";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";

const ROOT = "./_test/scenario/petaFilesController";
const DOG_FILE = resolve("./test/sampleDatas/dogLowRes.jpg");
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
      rmdirSync(resolve(ROOT, h.task.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.task.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.task.name));
  });
  test("importFilesFromFileInfos(file)", async () => {
    const fi = useFileImporter();
    const petaFiles = await fi.importFilesFromFileInfos({
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
    const fi = useFileImporter();
    const petaFiles = await fi.importFilesFromFileInfos({
      fileInfos: [{ name: "test", note: "", path: resolve("./test/sampleDatas") }],
      extract: true,
    });
    expect(petaFiles.length, "petaFiles.length").toBe(8);
    await useDBS().waitUntilKillable();
  });
  test("importRotatedFile", async () => {
    const rotatedFile = resolve("./test/sampleDatas/lizard-rotated.jpg");
    expect(await sharp(rotatedFile).metadata()).toMatchObject({
      width: 853,
      height: 1280,
      format: "jpeg",
    });
    const fi = useFileImporter();
    const petaFile = (
      await fi.importFilesFromFileInfos({
        fileInfos: [{ name: "rotated", note: "", path: rotatedFile }],
      })
    )[0];
    const filePaths = getPetaFilePath.fromPetaFile(petaFile);
    expect(filePaths.original.endsWith(".png")).toBeTruthy();
    expect(petaFile.metadata.mimeType).toBe("image/png");
    function stream() {
      return getStreamFromPetaFile(petaFile, "original");
    }
    expect((await fileTypeFromStream(stream()))?.mime).toBe("image/png");
    expect(await sharp(await streamToBuffer(stream())).metadata()).toMatchObject({
      width: 1280,
      height: 853,
      format: "png",
    });
    await useDBS().waitUntilKillable();
  });
  test("updatePetaFiles", async () => {
    const pfc = usePetaFilesController();
    const fi = useFileImporter();
    const petaFiles = await fi.importFilesFromFileInfos({
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
    expect(petaFiles.length, "petaFiles.length").toBe(8);
    Object.values(await pfc.getAll()).forEach((petaFile) => {
      expect(petaFile?.name, "name").toBe("newImage");
    });
    await useDBS().waitUntilKillable();
  });
  test("regenerateFileInfos", async () => {
    const pfc = usePetaFilesController();
    const fi = useFileImporter();
    await fi.importFilesFromFileInfos({
      fileInfos: [{ name: "test", note: "", path: resolve("./test/sampleDatas") }],
      extract: true,
    });
    const petaFiles = Object.values(await pfc.getAll());
    expect(petaFiles.length, "petaFiles.length").toBe(8);
    const prevThumbHashs = await ppa(
      async (pf) => fileSHA256(getPetaFilePath.fromPetaFile(pf).thumbnail),
      petaFiles,
    ).promise;
    const prevPFs = deepcopy(petaFiles);
    await ppa(async (pf) => rm(getPetaFilePath.fromPetaFile(pf).thumbnail), petaFiles).promise;
    await pfc.regeneratePetaFiles();
    const newThumbHashs = await ppa(
      async (pf) => fileSHA256(getPetaFilePath.fromPetaFile(pf).thumbnail),
      petaFiles,
    ).promise;
    expect(prevThumbHashs).toEqual(newThumbHashs);
    expect(prevPFs).toEqual(Object.values(await pfc.getAll()));
    await useDBS().waitUntilKillable();
  });
  test("encryptTempFile", async () => {
    ((global.fetch as any) = vi.fn()).mockResolvedValue(new Response(readFileSync(DOG_FILE)));
    const correctHash = await fileSHA256(DOG_FILE);
    const pfc = usePetaFilesController();
    const fi = useFileImporter();
    const info = await createFileInfo.fromURL(
      `https://takumus.io/dog.jpg`,
      undefined,
      undefined,
      false,
    ); // dummy url
    expect(info).toBeDefined();
    if (info !== undefined) {
      await fi.importFilesFromFileInfos({
        fileInfos: [info],
        extract: true,
      });
    }
    const petaFile = Object.values(await pfc.getAll())[0];
    expect(correctHash).toBe(petaFile.id);
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
