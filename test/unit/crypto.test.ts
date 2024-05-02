import { mkdirSync, readdirSync, rmdirSync } from "fs";
import { readFile, stat } from "fs/promises";
import { beforeEach } from "node:test";
import { resolve } from "path";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { ppa } from "@/commons/utils/pp";

import { fileSHA256 } from "@/main/utils/fileSHA256";
import { secureFile } from "@/main/utils/secureFile";

describe("crypto", () => {
  const ROOT = "./_test/unit/crypto";
  beforeAll(() => {
    try {
      rmdirSync(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  test("images", async () => {
    const files = readdirSync("./test/sampleDatas").filter((n) => !n.endsWith(".txt"));
    files.push(files[files.length - 1]);

    await ppa(async (file, i) => {
      const hash1 = await fileSHA256(resolve("./test/sampleDatas", file));
      const encPath = resolve(ROOT, "enc." + file);
      const decPath = resolve(ROOT, "dec." + file);
      await secureFile.encrypt.toFile(resolve("./test/sampleDatas", file), encPath, "1234");
      // 正しく復号する。
      await secureFile.decrypt.toFile(encPath, decPath, "1234");
      const hash2 = await fileSHA256(decPath);
      console.log(file, hash1, hash2);
      expect(hash1).toBe(hash2);
    }, files).promise;
  });
  test("advanced", async () => {
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample64byte.txt",
      resolve(ROOT, "sample64byte.txt.enc"),
      "1234",
    );
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample32byte.txt",
      resolve(ROOT, "sample32byte.txt.enc"),
      "1234",
    );
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample28byte.txt",
      resolve(ROOT, "sample28byte.txt.enc"),
      "1234",
    );
    // const size1 = await secureFile.decrypt.getFileSize(
    //   resolve(ROOT, "sample32byte.txt.enc"),
    //   "1234",
    // );
    // console.log(size1);
    // expect((await stat("./test/sampleDatas/sample32byte.txt")).size).toBe(size1.dec);
    // expect((await stat(resolve(ROOT, "sample32byte.txt.enc"))).size).toBe(size1.enc);

    // const size2 = await secureFile.decrypt.getFileSize(
    //   resolve(ROOT, "sample28byte.txt.enc"),
    //   "1234",
    // );
    // console.log(size2);
    // expect((await stat("./test/sampleDatas/sample28byte.txt")).size).toBe(size2.dec);
    // expect((await stat(resolve(ROOT, "sample28byte.txt.enc"))).size).toBe(size2.enc);

    // test: start block
    await secureFile.decrypt.toFile(
      resolve(ROOT, "sample64byte.txt.enc"),
      resolve(ROOT, "sample64byte.txt.enc.1-end.dec"),
      "1234",
      { startBlock: 1 },
    );
    const cropStart = (await readFile(resolve(ROOT, "sample64byte.txt.enc.1-end.dec"))).toString();
    console.log(cropStart);
    expect(cropStart).toBe(
      (await readFile("./test/sampleDatas/sample64byte.txt")).toString().slice(16 * 1),
    );
    // test: start-end block
    await secureFile.decrypt.toFile(
      resolve(ROOT, "sample64byte.txt.enc"),
      resolve(ROOT, "sample64byte.txt.enc.2-3.dec"),
      "1234",
      { startBlock: 2, endBlock: 3 },
    );
    const cropStartEnd = (await readFile(resolve(ROOT, "sample64byte.txt.enc.2-3.dec"))).toString();
    console.log(cropStartEnd);
    expect(cropStartEnd).toBe(
      (await readFile("./test/sampleDatas/sample64byte.txt")).toString().slice(16 * 2, 16 * 3),
    );
  });
});
