import { resolve } from "path";
import { describe, expect, test } from "vitest";

import { fileSHA256 } from "@/main/utils/fileSHA256";

describe("fileSHA256", () => {
  test("images", async () => {
    expect(await fileSHA256(resolve("./test/sampleDatas/bee.jpg"))).toBe(
      "da9c463318e720334478f9564c900e6d0432f599ee48d5279a26ac5b21ef81ea",
    );
    expect(await fileSHA256(resolve("./test/sampleDatas/bird.png"))).toBe(
      "ab9c465faf5c4a6b1f88983938e8e7fcb3c34e91f7293e8a92aece4571630a55",
    );
  });
});
