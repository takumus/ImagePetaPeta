import { resolve } from "path";
import { describe, expect, test } from "vitest";

import { fileSHA256 } from "@/main/utils/fileSHA256";

describe("fileSHA256", () => {
  test("images", async () => {
    expect(await fileSHA256(resolve("./test/sampleDatas/bee.jpg"))).toBe(
      "0416c7be28fb055fb2f973e225c0aa99e40a87c2ddcbcb21659dd5574541b1c1",
    );
    expect(await fileSHA256(resolve("./test/sampleDatas/bird.png"))).toBe(
      "9db358469d3cd82c32d37951d1e4a0768bfb9d2663a4b187f360e2a3ecf00e13",
    );
  });
});
