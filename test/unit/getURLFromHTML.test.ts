import { resolve } from "path";
import { describe, expect, test } from "vitest";

import { getURLFromHTML } from "@/renderer/utils/getURLFromHTML";

describe("getURLFromHTML", () => {
  test("src", async () => {
    const result = getURLFromHTML(`
    <img src="./test.png">
    `);
    expect(result).toMatchObject(["./test.png"]);
  });
  test("child", async () => {
    const result = getURLFromHTML(`
    <div>
      <img src="./test.png">
    </div>
    `);
    expect(result).toMatchObject(["./test.png"]);
  });
  test("srcset", async () => {
    const result = getURLFromHTML(`
    <img srcset="./test-100.png 100w,
      ./test-200.png 200w,
      ./test-400.png 400w
      ./test-300.png 300w">
    `);
    expect(result).toMatchObject(["./test-400.png"]);
  });
  test("both", async () => {
    const result = getURLFromHTML(`
    <img srcset="./test-100.png 100w,
      ./test-200.png 200w,
      ./test-400.png 400w
      ./test-300.png 300w"
      src="./test.png">
    `);
    expect(result).toMatchObject(["./test-400.png", "./test.png"]);
  });
  test("nourl", async () => {
    const result = getURLFromHTML(`
    <img>
    `);
    expect(result).toBeUndefined();
  });
});
