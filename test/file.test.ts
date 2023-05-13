import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { beforeEach, describe, expect, test } from "vitest";

import {
  initDirectory,
  initDirectorySync,
  initFile,
  initFileSync,
  mkdirIfNotIxistsSync,
  readDirRecursive,
} from "@/main/libs/file";

describe("file", () => {
  const ROOT = "./_test/file";
  beforeEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
  });
  test("initFile", async () => {
    const path = resolve(ROOT, "hello.json");
    const res1 = await initFile(path);
    expect(res1).toBe(path);
    writeFileSync(path, "");
    const res2 = await initFile(path);
    expect(res2).toBe(path);
  });
  test("initFileSync", () => {
    const path = resolve(ROOT, "hello.json");
    const res1 = initFileSync(path);
    expect(res1).toBe(path);
    writeFileSync(path, "");
    const res2 = initFileSync(path);
    expect(res2).toBe(path);
  });
  test("initDirectory", async () => {
    const path = resolve(ROOT, "hello1", "hello2");
    const res1 = await initDirectory(true, path);
    expect(res1).toBe(path);
    const res2 = await initDirectory(true, path);
    expect(res2).toBe(path);
    const res3 = await initDirectory(false, path);
    expect(res3).toBe(path);
  });
  test("initDirectorySync", () => {
    const path = resolve(ROOT, "hello1", "hello2");
    const res1 = initDirectorySync(true, path);
    expect(res1).toBe(path);
    const res2 = initDirectorySync(true, path);
    expect(res2).toBe(path);
    const res3 = initDirectorySync(false, path);
    expect(res3).toBe(path);
  });
  test("readDirRecursive", async () => {
    const dirs = [
      resolve(ROOT, "1"),
      resolve(ROOT, "1", "1-2"),
      resolve(ROOT, "1", "1-3", "1-3-2"),
      resolve(ROOT, "1", "1-3", "1-3-3"),
      resolve(ROOT, "1", "1-3", "1-3-4"),
    ];
    const files = [
      resolve(ROOT, "1", "1-1.json"),
      resolve(ROOT, "1", "1-2", "1-2-1.json"),
      resolve(ROOT, "1", "1-3", "1-3-1.json"),
      resolve(ROOT, "1", "1-3", "1-3-2", "1-3-2-1.json"),
      resolve(ROOT, "1", "1-3", "1-3-3", "1-3-3-1.json"),
      resolve(ROOT, "1", "1-3", "1-3-3", "1-3-3-2.json"),
    ];
    dirs.forEach((path) => {
      mkdirIfNotIxistsSync(path, { recursive: true });
    });
    files.forEach((path) => {
      writeFileSync(path, "");
    });
    const res = await readDirRecursive(resolve(ROOT, "1")).files;
    files.sort();
    res.sort();
    expect(res.join(",")).toBe(files.join(","));
  });
});
