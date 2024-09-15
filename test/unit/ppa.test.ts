import { describe, expect, test, vi } from "vitest";

import { pp, ppa, PPCancelError } from "@/commons/utils/pp";

describe("ppa", () => {
  test("data", async () => {
    const input = [1, 2, 3, 2, 1];
    const result = await ppa(async (value) => {
      return value * 2;
    }, input).promise;
    expect(result).toMatchObject([1, 2, 3, 2, 1].map((v) => v * 2));
  });
  test("serial", async () => {
    const input = [1, 2, 3];
    const eachTaskTime = 500;
    const beginTime = Date.now();
    const result = await ppa(async (value) => {
      await new Promise((res) => setTimeout(res, eachTaskTime));
      return value;
    }, input).promise;
    expect(result).toMatchObject([1, 2, 3]);
    const timeDiff = Math.abs(Date.now() - beginTime - eachTaskTime * input.length);
    console.log("time:", timeDiff);
    expect(timeDiff).toBeLessThan(eachTaskTime / 2);
  });
  test("2", async () => {
    const input = [1, 2, 3];
    const eachTaskTime = 500;
    const beginTime = Date.now();
    const result = await ppa(
      async (value) => {
        await new Promise((res) => setTimeout(res, eachTaskTime));
        return value;
      },
      input,
      2,
    ).promise;
    expect(result).toMatchObject([1, 2, 3]);
    const timeDiff = Math.abs(Date.now() - beginTime - eachTaskTime * 2);
    console.log("time:", timeDiff);
    expect(timeDiff).toBeLessThan(eachTaskTime / 2);
  });
  test("infinity", async () => {
    const input = [1, 2, 3];
    const eachTaskTime = 500;
    const beginTime = Date.now();
    const result = await ppa(
      async (value) => {
        await new Promise((res) => setTimeout(res, eachTaskTime));
        return value;
      },
      input,
      Infinity,
    ).promise;
    expect(result).toMatchObject([1, 2, 3]);
    const timeDiff = Math.abs(Date.now() - beginTime - eachTaskTime);
    console.log("time:", timeDiff);
    expect(timeDiff).toBeLessThan(eachTaskTime / 2);
  });
  test("cancel", async () => {
    const input = [1, 2, 3, 4];
    const eachTaskTime = 500;
    const beginTime = Date.now();
    const ended: number[] = [];
    let completed = false;
    const process = ppa(async (value) => {
      await new Promise((res) => setTimeout(res, eachTaskTime));
      ended.push(value);
      return value;
    }, input);
    setTimeout(async () => {
      await process.cancel();
      expect(completed, "completed before canceled").toBe(true);
    }, 600);
    try {
      await process.promise;
    } catch (error) {
      expect(error).instanceOf(PPCancelError);
      if (error instanceof PPCancelError) {
        expect(error.all).toBe(input.length);
        expect(error.remaining).toBe(input.length - ended.length);
      }
      const timeDiff = Math.abs(Date.now() - beginTime - eachTaskTime * 2);
      console.log("time:", timeDiff);
      expect(timeDiff).toBeLessThan(eachTaskTime / 2);
      expect(ended).toMatchObject([1, 2]);
    }
    completed = true;
  });
});
