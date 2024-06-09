import { mkdirSync, readFileSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { initDummyElectron } from "./initDummyElectron";
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
  async function post<C extends keyof IpcFunctions, U extends keyof IpcFunctions[C]>(
    apiKey: string,
    category: C,
    event: U,
    ...args: Parameters<
      IpcFunctions[C][U] extends (...args: any) => any ? IpcFunctions[C][U] : never
    >
  ): Promise<
    | {
        response: Awaited<
          ReturnType<IpcFunctions[C][U] extends (...args: any) => any ? IpcFunctions[C][U] : never>
        >;
      }
    | { error: string }
  > {
    const response = await fetch("http://localhost:51920/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "impt-web-api-key": apiKey,
      },
      body: JSON.stringify({
        event: `${category}.${event as any}`,
        args,
      }),
    });
    return response.json();
  }
  test("importFiles", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    try {
      const ids = await post(webhook.getAPIKEY(), "importer", "importFiles", [
        [
          {
            type: "filePath",
            filePath: resolve("./test/sampleDatas/bee.jpg"),
          },
        ],
      ]);
      if ("error" in ids) {
        throw `${ids}`;
      }
      expect(ids.response.length).toBe(1);
    } catch (error) {
      await webhook.close();
      throw error;
    }
    await webhook.close();
  });
  test("whitelist", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    try {
      const appInfo = await post(webhook.getAPIKEY(), "settings", "getSettings");
      expect(appInfo).property("error");
    } catch (error) {
      await webhook.close();
      throw error;
    }
    await webhook.close();
  });
  test("wrongAPIKey", async () => {
    const webhook = useWebHook();
    await webhook.open(51920);
    try {
      const appInfo = await post("wawawawawa", "settings", "getSettings");
      expect(appInfo).property("error");
    } catch (error) {
      await webhook.close();
      throw error;
    }
    await webhook.close();
  });
});
