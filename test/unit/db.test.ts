import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DB from "@/main/libs/db";

describe("file", () => {
  const ROOT = "./_test/unit/db";
  beforeEach(async () => {
    try {
      await rm(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
    vi.spyOn(global, "fetch").mockImplementation(
      async () => new Response('{ "key": "value" }', { status: 200 }),
    );
  });
  test("save and load", async () => {
    const db = new DB<{ value: string; id: string }>("db", resolve(ROOT, "db.db"));
    await db.init();
    await db.insert({ value: "hello", id: "1" });
    await new Promise<void>((res) => {
      db.on("doneCompaction", () => {
        res();
      });
    });
    const db2 = new DB<{ value: string; id: string }>("db", resolve(ROOT, "db.db"));
    await db2.init();
    const res = await db2.find({ id: "1" });
    expect(res[0].value).toBe("hello");
  });
  test("unique", async () => {
    const db = new DB<{ value: string; id: string }>("db", resolve(ROOT, "db.db"));
    await db.init();
    await db.ensureIndex({
      fieldName: "id",
      unique: true,
    });
    await db.insert({ value: "hello", id: "1" });
    await db.insert({ value: "bye", id: "1" });
    expect(db.getAll().length).toBe(1);
  });
});
