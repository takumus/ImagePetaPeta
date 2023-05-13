import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { beforeEach, describe, expect, test } from "vitest";

import Config from "@/main/libs/config";
import { createSyncMigrater } from "@/main/libs/createMigrater";

const ROOT = "./_test/unit/config";
const CONFIG_FILE_PATH = resolve(ROOT, "config.json");
describe("config", () => {
  beforeEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
  });
  test("default data", () => {
    const config = new Config(CONFIG_FILE_PATH, { value: "hello" });
    expect(config.data.value).toBe("hello");
  });
  test("save and load", () => {
    const config = new Config(CONFIG_FILE_PATH, { value: "hello" });
    config.save();
    const config2 = new Config(CONFIG_FILE_PATH, { value: "bye" });
    config2.load();
    expect(config2.data.value).toBe("hello");
  });
  test("migrate", () => {
    const config = new Config(
      CONFIG_FILE_PATH,
      { value: "hello" },
      createSyncMigrater((data, update) => {
        if (data.value === "hello") {
          data.value = "bye";
          update();
        }
        return data;
      }),
    );
    expect(config.data.value).toBe("bye");
  });
});
