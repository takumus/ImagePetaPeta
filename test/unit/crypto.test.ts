import { mkdirSync, readdirSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ppa } from "@/commons/utils/pp";

import { decryptFile, encryptFile } from "@/main/utils/encryptFile";
import { fileSHA256 } from "@/main/utils/fileSHA256";

describe("crypto", () => {
  const ROOT = "./_test/unit/crypto";
  beforeEach(() => {
    try {
      rmdirSync(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  test("crypto", async () => {
    const files = readdirSync("./test/sampleDatas");

    await ppa(
      async (file) => {
        const hash1 = await fileSHA256(resolve("./test/sampleDatas", file));
        const encPath = resolve(ROOT, "enc." + file);
        const decPath = resolve(ROOT, "dec." + file);
        await encryptFile(resolve("./test/sampleDatas", file), encPath, "1234");
        await decryptFile(encPath, decPath, "1234");
        const hash2 = await fileSHA256(decPath);
        console.log(file, hash1, hash2);
        expect(hash1).toBe(hash2);
      },
      files.filter((n) => !n.endsWith(".txt")),
    ).promise;
  });
});
