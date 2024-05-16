import { describe, expect, test, vi } from "vitest";

import { getLatestVersion, isLatest } from "@/main/utils/versions";

describe("version", () => {
  test("isLatest", () => {
    expect(isLatest("2.0.0", "1.0.0")).toBe(true);
    expect(isLatest("1.0.0", "2.0.0")).toBe(false);
    expect(isLatest("1.0.0", "1.1.0")).toBe(false);
    expect(isLatest("1.0.0", "1.0.1")).toBe(false);
    expect(isLatest("1.0.0", "1.0.0.1")).toBe(false);
    expect(isLatest("2", "1.0.0")).toBe(true);
    expect(isLatest("1.0.0", "2")).toBe(false);
    expect(isLatest("1.0.0", "1.0.0")).toBe(true);
    expect(isLatest("1.0.0-beta.3", "1.0.0-beta.2")).toBe(true);
    expect(isLatest("1.0.0-beta.2", "1.0.0-beta.3")).toBe(false);
    expect(isLatest("1.0.0-beta.3", "1.0.0-beta.20")).toBe(false);
    expect(isLatest("1.0.2-beta.2", "1.0.1-beta.2")).toBe(true);
    expect(isLatest("1.0.2-beta.2", "1.0.1-beta.22")).toBe(true);
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
    ((global.fetch as any) = vi.fn()).mockResolvedValue(
      new Response(
        JSON.stringify({
          version: "2.0.0",
        }),
      ),
    );
    const result = await getLatestVersion();
    expect(result).property("isLatest", false);
    expect(result).property("version", "2.0.0");
  });
});
