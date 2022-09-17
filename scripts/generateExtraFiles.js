const script = require("./@script");
const AdmZip = require("adm-zip");
script.run("generate extra files", async () => {
  const extras = [];
  extras.push(
    await add(
      "win32",
      "realesrgan",
      [
        "models/realesrgan-x4plus-anime.bin",
        "models/realesrgan-x4plus-anime.param",
        "models/realesrgan-x4plus.bin",
        "models/realesrgan-x4plus.param",
        "realesrgan-ncnn-vulkan.exe",
        "vcomp140.dll",
        "vcomp140d.dll",
      ],
      "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip",
    ),
  );
  extras.push(
    await add(
      "darwin",
      "realesrgan",
      ["models/", "realesrgan-ncnn-vulkan"],
      "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip",
    ),
  );
  script.utils.log(
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
    ),
  );
});
async function add(platform, name, files, url) {
  const developmentPath =
    script.files.output.electron.resources.tempExtraFiles + "/" + platform + "/" + name;
  const productionPath =
    script.files.output.electron.resources.extraFiles + "/" + platform + "/" + name;
  if (platform === process.platform) {
    script.utils.log(name, platform);
    try {
      script.utils.readdir(developmentPath);
      script.utils.log(`exists: ${developmentPath}`);
    } catch (err) {
      script.utils.log(`download: ${url}`);
      const zip = new AdmZip(Buffer.from(await (await fetch(url)).arrayBuffer()));
      script.utils.mkdir(developmentPath);
      files.map((file) => {
        script.utils.log(`+${file}`);
        zip.extractEntryTo(file, developmentPath, undefined, true);
      });
      script.utils.log("complete");
    }
  }
  return {
    name,
    platform,
    productionPath,
    developmentPath,
    files,
  };
}
