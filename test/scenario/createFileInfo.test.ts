import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { createFileInfo } from "@/main/provides/controllers/petaFilesController/createFileInfo";
import { fileSHA256 } from "@/main/utils/fileSHA256";

const ROOT = "./_test/scenario/createFileInfo";
const DOG_FILE = resolve("./test/sampleDatas/dogLowRes.jpg");
describe("createFileInfo", () => {
  beforeAll(async () => {
    rmSync(resolve(ROOT), { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    rmSync(resolve(ROOT, h.meta.name), { recursive: true, force: true });
    mkdirSync(resolve(ROOT, h.meta.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.meta.name));
  });
  test("fromBuffer", async () => {
    const correctHash = await fileSHA256(DOG_FILE);
    const info = await createFileInfo.fromBuffer(readFileSync(DOG_FILE));
    expect(info).toBeDefined();
    if (info === undefined) {
      return;
    }
    expect(await fileSHA256(info.path)).toBe(correctHash);
  });
  test("fromBase64URL", async () => {
    const correctHash = await fileSHA256(DOG_FILE);
    const info = await createFileInfo.fromURL(
      `data:image/jpg;base64,${readFileSync(DOG_FILE).toString("base64")}`,
    );
    expect(info).toBeDefined();
    if (info === undefined) {
      return;
    }
    expect(await fileSHA256(info.path)).toBe(correctHash);
  });
  test("fromRemoteURL", async () => {
    (global.fetch = vi.fn()).mockResolvedValue(new Response(readFileSync(DOG_FILE)));
    const correctHash = await fileSHA256(DOG_FILE);
    const info = await createFileInfo.fromURL(`https://takumus.io/dog.jpg`); // dummy url
    expect(info).toBeDefined();
    if (info === undefined) {
      return;
    }
    expect(await fileSHA256(info.path)).toBe(correctHash);
  });
});
