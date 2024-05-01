import { mkdirSync, readdirSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ppa } from "@/commons/utils/pp";

import { secureFile } from "@/main/utils/encryptFile";
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
    const files = readdirSync("./test/sampleDatas").filter((n) => !n.endsWith(".txt"));
    files.push(files[files.length - 1]);

    await ppa(async (file, i) => {
      const hash1 = await fileSHA256(resolve("./test/sampleDatas", file));
      const encPath = resolve(ROOT, "enc." + file);
      const decPath = resolve(ROOT, "dec." + file);
      await secureFile.encrypt.asFile(resolve("./test/sampleDatas", file), encPath, "1234");
      if (i === files.length - 1) {
        // 最後だけパスワードを間違える。
        const res = await (async () => {
          try {
            await secureFile.decrypt.asFile(encPath, decPath, "12345");
            return true;
          } catch (err) {
            console.log(err);
            return false;
          }
        })();
        expect(res).toBe(false);
      } else {
        // 正しく復号する。
        await secureFile.decrypt.asFile(encPath, decPath, "1234");
        const hash2 = await fileSHA256(decPath);
        console.log(file, hash1, hash2);
        expect(hash1).toBe(hash2);
      }
    }, files).promise;
  });
});
