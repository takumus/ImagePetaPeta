import deepcopy from "lodash.clonedeep";
import { describe, expect, test } from "vitest";

import { createMigrater, createSyncMigrater } from "@/main/libs/createMigrater";

describe("migrate", () => {
  test("no updates", async () => {
    const data = {
      version: 1,
      value: 1,
    };
    const res1 = createSyncMigrater<typeof data>((data) => {
      return data;
    })(deepcopy(data));
    expect(res1.updated).toBe(false);
    expect(res1.data.value).toBe(1);
    const res2 = await createMigrater<typeof data>(async (data) => {
      return data;
    })(deepcopy(data));
    expect(res2.updated).toBe(false);
    expect(res2.data.value).toBe(1);
  });
  test("updates", async () => {
    const data = {
      version: 1,
      value: 1,
    };
    const res1 = createSyncMigrater<typeof data>((data, update) => {
      if (data.version < 2) {
        data.version = 2;
        data.value = 2;
        update();
      }
      return data;
    })(deepcopy(data));
    expect(res1.updated).toBe(true);
    expect(res1.data.version).toBe(2);
    expect(res1.data.value).toBe(2);
    const res2 = await createMigrater<typeof data>(async (data, update) => {
      if (data.version < 2) {
        data.version = 2;
        data.value = 2;
        update();
      }
      return data;
    })(deepcopy(data));
    expect(res2.updated).toBe(true);
    expect(res2.data.version).toBe(2);
    expect(res2.data.value).toBe(2);
  });
});
