import { createHash, randomBytes } from "crypto";
import { rm } from "fs/promises";
import { mkdirSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach } from "node:test";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { ppa } from "@/commons/utils/pp";

import { fileSHA256 } from "@/main/utils/fileSHA256";
import { secureFile } from "@/main/utils/secureFile";

const KEY = createHash("sha512").update("1234").digest("hex").substring(0, 32);
describe("crypto", () => {
  const ROOT = "./_test/unit/crypto";
  beforeAll(async () => {
    try {
      await rm(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  test("images", async () => {
    const files = readdirSync("./test/sampleDatas").filter((n) => !n.endsWith(".txt"));
    files.push(files[files.length - 1]);
    await ppa(async (file, i) => {
      const iv = randomBytes(16);
      const hash1 = await fileSHA256(resolve("./test/sampleDatas", file));
      const encPath = resolve(ROOT, "enc." + file);
      const decPath = resolve(ROOT, "dec." + file);
      await secureFile.encrypt.toFile(
        resolve("./test/sampleDatas", file),
        encPath,
        KEY,
        {},
        true,
        iv,
      );
      // 正しく復号する。
      await secureFile.decrypt.toFile(encPath, decPath, KEY, {}, true, iv);
      const hash2 = await fileSHA256(decPath);
      console.log(file, hash1, hash2);
      expect(hash1).toBe(hash2);
    }, files).promise;
  });
  test("stream", async () => {
    const iv = randomBytes(16);
    // 暗号化してストリームへ
    const stream = secureFile.encrypt.toStream(
      "./test/sampleDatas/sample64byte.txt",
      KEY,
      undefined,
      iv,
    );
    const hash = await fileSHA256(secureFile.decrypt.toStream(stream, KEY, undefined, iv));
    // 暗号化ストリームを復号して元ファイルと確認。
    expect(await fileSHA256("./test/sampleDatas/sample64byte.txt")).toBe(hash);
  });
  test("advanced", async () => {
    const iv = randomBytes(16);
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample64byte.txt",
      resolve(ROOT, "sample64byte.txt.enc"),
      KEY,
      undefined,
      true,
      iv,
    );
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample32byte.txt",
      resolve(ROOT, "sample32byte.txt.enc"),
      KEY,
      undefined,
      true,
      iv,
    );
    await secureFile.encrypt.toFile(
      "./test/sampleDatas/sample28byte.txt",
      resolve(ROOT, "sample28byte.txt.enc"),
      KEY,
      undefined,
      true,
      iv,
    );
    // test: start block
    await secureFile.decrypt.toFile(
      resolve(ROOT, "sample64byte.txt.enc"),
      resolve(ROOT, "sample64byte.txt.enc.1-end.dec"),
      KEY,
      { startBlock: 1 },
      false,
      iv,
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
      KEY,
      { startBlock: 2, endBlock: 3 },
      false,
      iv,
    );
    const cropStartEnd = (await readFile(resolve(ROOT, "sample64byte.txt.enc.2-3.dec"))).toString();
    console.log(cropStartEnd);
    expect(cropStartEnd).toBe(
      (await readFile("./test/sampleDatas/sample64byte.txt")).toString().slice(16 * 2, 16 * 3),
    );
  });
});
