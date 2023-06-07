import { initDummyElectron } from "./initDummyElectron";
import { mkdirSync, readFileSync, rmdirSync } from "fs";
import { resolve } from "path";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

import { ipcFunctions } from "@/main/ipcFunctions";
import { useWebHook } from "@/main/provides/webhook";

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
      rmdirSync(resolve(ROOT, h.task.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.task.name), { recursive: true });
    await initDummyElectron(resolve(ROOT, h.task.name));
  });
  async function post<U extends keyof IpcFunctions>(
    apiKey: string,
    event: U,
    ...args: Parameters<IpcFunctions[U]>
  ): Promise<Awaited<ReturnType<IpcFunctions[U]>>> {
    const response = await fetch("http://localhost:51920/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "impt-web-api-key": apiKey,
      },
      body: JSON.stringify({
        event,
        args,
      }),
    });
    return response.json();
  }
  test("importFiles", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    const ids = await post(webhook.getAPIKEY(), "importFiles", [
      [
        {
          type: "filePath",
          filePath: resolve("./test/sampleDatas/bee.jpg"),
        },
      ],
    ]);
    expect(ids.length).toBe(1);
    await webhook?.close();
  });
  test("whitelist", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    const appInfo = (await post(webhook.getAPIKEY(), "getSettings")) as any;
    expect(appInfo).property("error");
    await webhook?.close();
  });
  test("wrongAPIKey", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    const appInfo = (await post("wawawawawa", "getSettings")) as any;
    expect(appInfo).property("error");
  });
});
