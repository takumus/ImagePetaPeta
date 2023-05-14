import { resolve } from "path";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getLatestVersion, isLatest } from "@/main/utils/versions";

describe("version", () => {
  test("isLatest", () => {
    expect(isLatest("2.0.0", "1.0.0")).toBe(true);
    expect(isLatest("1.0.0", "2.0.0")).toBe(false);
    expect(isLatest("1.0.0", "1.1.0")).toBe(false);
    expect(isLatest("1.0.0", "1.0.1")).toBe(false);
    expect(isLatest("1.0.0", "1.0.0.1")).toBe(false);
    expect(isLatest("2", "1.0.1")).toBe(true);
    expect(isLatest("1.0.0", "1.0.0")).toBe(true);
  });
  test("isLatest", async () => {
    vi.mock("electron", () => {
      return {
        app: {
          getVersion() {
            return "1.0.0";
          },
        },
      };
    });
    vi.mock("axios", () => {
      return {
        default: {
          async get() {
            await new Promise((res) => {
              setTimeout(res, 1000);
            });
            return {
              data: {
                version: "2.0.0",
              },
            };
          },
        },
      };
    });
    const result = await getLatestVersion();
    expect(result).property("isLatest", false);
    expect(result).property("version", "2.0.0");
  });
});
