const script = require("./@script");
const AdmZip = require("adm-zip");
script.run("generate extra files", async () => {
  const extras = [];
  extras.push(
    await createExtra(
      "win32",
      "realesrgan",
      ["models/", "realesrgan-ncnn-vulkan.exe", "vcomp140.dll", "vcomp140d.dll"],
      downloadZIP,
      "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip",
    ),
  );
  extras.push(
    await createExtra(
      "darwin",
      "realesrgan",
      ["models/", "realesrgan-ncnn-vulkan"],
      downloadZIP,
      "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip",
    ),
  );
  script.utils.log(writeExtraFilesTS(extras));
});
function writeExtraFilesTS(extras) {
  script.utils.write(
    "./src/@assets/extraFiles.ts",
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
async function createExtra(platform, name, files, prepare, ...prepareArgs) {
  script.utils.log(name, `platform: ${platform}`);
  const platformPath = platform === "all" ? "" : platform + "/";
  const developmentPath =
    script.files.output.electron.resources.tempExtraFiles + "/" + platformPath + name;
  const productionPath =
    script.files.output.electron.resources.extraFiles + "/" + platformPath + name;
  const extra = {
    name,
    platform,
    productionPath,
    developmentPath,
    files,
  };
  await prepare?.(extra, ...prepareArgs);
  return extra;
}
async function downloadZIP(extra, url) {
  if (extra.platform === process.platform || extra.platform === "all") {
    try {
      script.utils.readdir(extra.developmentPath);
    } catch (err) {
      script.utils.log(`download: ${url}`);
      const zip = new AdmZip(Buffer.from(await (await fetch(url)).arrayBuffer()));
      script.utils.mkdir(extra.developmentPath);
      extra.files.map((file) => {
        zip.extractEntryTo(file, extra.developmentPath, undefined, true);
      });
      script.utils.log("complete!");
    }
  }
}
