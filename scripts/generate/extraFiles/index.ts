import { copyFileSync, cpSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { generateLicenses } from "./licenses";
import AdmZip from "adm-zip";
import { normalizePath } from "vite";

interface ExtraFile {
  name: string;
  platform: NodeJS.Platform | "universal";
  productionPath: string;
  developmentPath: string;
  files: string[];
}
(async () => {
  const extras = [];
  extras.push(
    await createExtra({
      platform: "universal",
      name: "licenses",
      files: ["licenses.json"],
      prepare: async (extraFile) => {
        mkdirSync(extraFile.developmentPath, { recursive: true });
        writeFileSync(
          resolve(extraFile.developmentPath, "licenses.json"),
          await generateLicenses(),
        );
      },
    }),
  );
  extras.push(
    await createExtra({
      platform: "universal",
      name: "supporters",
      files: ["supporters.json"],
      prepare: async (extraFile) => {
        mkdirSync(extraFile.developmentPath, { recursive: true });
        copyFileSync(
          "./resources/supporters/supporters.json",
          resolve(extraFile.developmentPath, "supporters.json"),
        );
      },
    }),
  );
  extras.push(
    await createExtra({
      platform: "universal",
      name: "mobilenet",
      files: [
        "model.json",
        "group1-shard1of4.bin",
        "group1-shard2of4.bin",
        "group1-shard3of4.bin",
        "group1-shard4of4.bin",
      ],
      prepare: async (extraFile) => {
        try {
          readdirSync(extraFile.developmentPath);
        } catch {
          mkdirSync(extraFile.developmentPath, { recursive: true });
          await Promise.all(
            extraFile.files.map(async (n) => {
              console.log("download:", n);
              const data = await (
                await fetch(
                  "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2/" +
                    n +
                    "?tfjs-format=file",
                )
              ).arrayBuffer();
              writeFileSync(resolve(extraFile.developmentPath, n), Buffer.from(data));
            }),
          );
        }
      },
    }),
  );
  extras.push(
    await createExtra({
      platform: "win32",
      name: "realesrgan",
      files: ["models/", "realesrgan-ncnn-vulkan.exe", "vcomp140.dll", "vcomp140d.dll"],
      prepare: downloadZIP(
        "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip",
      ),
    }),
  );
  extras.push(
    await createExtra({
      platform: "darwin",
      name: "realesrgan",
      files: ["models/", "realesrgan-ncnn-vulkan"],
      prepare: downloadZIP(
        "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip",
      ),
    }),
  );
  writeExtraFilesTS(extras);
})();
function writeExtraFilesTS(extras: ExtraFile[]) {
  writeFileSync(
    "./src/_defines/extraFiles.ts",
    Buffer.from(
      `const development = process.env.NODE_ENV === "development";\nexport const extraFiles = {\n` +
        extras
          .map(
            (extra) =>
              `  "${extra.name}.${extra.platform}": {\n` +
              extra.files
                .map(
                  (file) =>
                    `    "${file}": development\n      ? "${extra.developmentPath}/${file}"\n      : "${extra.productionPath}/${file}",`,
                )
                .join("\n") +
              `\n  },`,
          )
          .join("\n") +
        `\n};`,
      "utf-8",
    ),
  );
}
async function createExtra(params: {
  platform: NodeJS.Platform | "universal";
  name: string;
  files: string[];
  prepare?: (extra: ExtraFile) => Promise<unknown>;
}) {
  const developmentPath = normalizePath(
    join("./_electronTemp/extraFiles", params.platform, params.name),
  );
  const productionPath = normalizePath(join("./extraFiles", params.platform, params.name));
  const extra: ExtraFile = {
    name: params.name,
    platform: params.platform,
    productionPath,
    developmentPath,
    files: params.files,
  };
  await params.prepare?.(extra);
  return extra;
}
function downloadZIP(url: string) {
  return async (extra: ExtraFile) => {
    if (extra.platform === process.platform || extra.platform === "universal") {
      try {
        readdirSync(extra.developmentPath);
      } catch (err) {
        console.log("download", url);
        const zip = new AdmZip(Buffer.from(await (await fetch(url)).arrayBuffer()));
        mkdirSync(extra.developmentPath, { recursive: true });
        extra.files.map((file) => {
          zip.extractEntryTo(file, extra.developmentPath, undefined, true);
        });
      }
    }
  };
}
