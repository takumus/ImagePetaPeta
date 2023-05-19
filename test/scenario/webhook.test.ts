import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, readFileSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

import { ipcFunctions } from "@/main/ipcFunctions";
import { initWebhook } from "@/main/webhook";

const ROOT = "./_test/scenario/webhook";
describe("webhook", () => {
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
  async function post<U extends keyof IpcFunctions>(
    event: U,
    ...args: Parameters<IpcFunctions[U]>
  ): Promise<Awaited<ReturnType<IpcFunctions[U]>>> {
    const response = await fetch("http://localhost:51920/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        args,
      }),
    });
    return response.json();
  }
  test("importFiles", async () => {
    const webhook = await initWebhook(ipcFunctions, true);
    const ids = await post("importFiles", [
      [
        {
          type: "filePath",
          filePath: resolve("./test/sampleDatas/bee.jpg"),
        },
      ],
      [
        {
          type: "buffer",
          buffer: readFileSync(resolve("./test/sampleDatas/dog.jpg")),
        },
      ],
    ]);
    expect(ids.length).toBe(2);
    const petaFiles = await post("getPetaFiles");
    expect(Object.values(petaFiles).length).toBe(2);
    expect(petaFiles[ids[0]]).toBeTruthy();
    expect(petaFiles[ids[1]]).toBeTruthy();
    await webhook?.close();
  });
  test("whitelist", async () => {
    const webhook = await initWebhook(ipcFunctions, true);
    const appInfo = (await post("getSettings")) as any;
    expect(appInfo).property("error");
    await webhook?.close();
  });
});
