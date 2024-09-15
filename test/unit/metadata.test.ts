import { mkdirSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { PetaColor } from "@/commons/datas/petaColor";
import { ciede } from "@/commons/utils/colors";
import { ppa } from "@/commons/utils/pp";

import { provide } from "@/main/libs/di";
import { generateFileInfo } from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { Logger, loggerKey } from "@/main/provides/utils/logger";

const ROOT = "./_test/unit/metadata";
const OVERWRITE = process.env.TEST_METADATA === "true";
describe("metadata", () => {
  beforeAll(async (h) => {
    try {
      // rmdirSync(resolve(ROOT), { recursive: true });
    } catch {
      //
    }
    mkdirSync(ROOT, { recursive: true });
  });
  beforeEach(async (h) => {
    try {
      // rmdirSync(resolve(ROOT, h.task.name), { recursive: true });
    } catch {
      //
    }
    mkdirSync(resolve(ROOT, h.task.name), { recursive: true });
    provide(loggerKey, new Logger(resolve(ROOT, h.task.name)));
  });
  test("generate", async (h) => {
    // const files: string[] = (await readdir(resolve("./test/sampleDatas"))).map((file) =>
    //   resolve("./test/sampleDatas", file),
    // );
    const files: string[] = [resolve("./test/sampleDatas/rgb.png")];
    console.time("time");
    const palettes: { palette: PetaColor[]; path: string }[] = [];
    await ppa(async (file) => {
      try {
        console.time(file);
        const metadata = await generateFileInfo(file);
        if (metadata !== undefined) {
          palettes.push({
            palette: metadata.metadata.palette,
            path: basename(file) + ".webp",
          });
          writeFile(
            resolve(ROOT, h.task.name, basename(file) + ".webp"),
            metadata.thumbnail.buffer,
          );
        }
        console.timeEnd(file);
      } catch (error) {
        console.log(error);
      }
    }, files).promise;
    console.timeEnd("time");
    const htmlPath = resolve(resolve(ROOT, h.task.name), "out.html");
    console.log("output:", htmlPath);
    await writeFile(
      htmlPath,
      Buffer.from(
        `
        <html>
          <head>
            <style>
            body {
              font-family: consolas;
              text-align: center;
              background-color: #333333;
              color: #ffffff;
              font-weight: bold;
              word-break: break-word;
            }
            span {
              letter-spacing: -0.03em;
              font-size: var(--size-0);
            }
            </style>
          </head>
          <body>
          ${palettes
            .map(
              (p) =>
                `<img src="${p.path}" width="256px">
                <br><br>
                <div>[` +
                p.palette
                  .map(
                    (c) =>
                      `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">███</span><span>${c.population}</span>`,
                  )
                  .join("") +
                `]</div><br><br>`,
            )
            .join("")}
          </body>
        </html>
        `,
        "utf-8",
      ),
    );
    expect(palettes.length).toBe(1);
    expect(palettes[0].palette.length).toBe(3);
    expect(palettes[0].palette.find((p) => ciede(p, [0, 255, 0]) < 1)).toBeTruthy();
    expect(palettes[0].palette.find((p) => ciede(p, [255, 0, 0]) < 1)).toBeTruthy();
    expect(palettes[0].palette.find((p) => ciede(p, [0, 0, 255]) < 1)).toBeTruthy();
  });
});
