const script = require("./@script");
var AdmZip = require("adm-zip");
const axios = require("axios").default;
script.run("generate extra files", async () => {
  const externals = [];
  externals.push(
    await add(
      "Real-ESRGAN",
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
  script.utils.log(
    script.utils.write(
      "./src/@assets/extraFiles.ts",
      Buffer.from(
        `export const extraFiles = {\n` +
          externals
            .map((external) => {
              return (
                `  "${external.name}": {\n` +
                external.files
                  .map((file) => {
                    return `    "${file}": process.env.NODE_ENV === "development" ? "${external.developmentPath}/${file}" : "${external.productionPath}/${file}"`;
                  })
                  .join(",\n") +
                `\n  }`
              );
            })
            .join(",\n") +
          `\n};`,
        "utf-8",
      ),
    ),
  );
});
async function add(name, destPath, targetFiles, url) {
  script.utils.log(name);
  const developmentPath = script.files.output.electron.resources.tempExtraFiles + "/" + destPath;
  try {
    script.utils.readdir(developmentPath);
    script.utils.log(`exists: ${developmentPath}`);
  } catch (err) {
    script.utils.log(`download: ${url}`);
    const data = await axios.get(url, { responseType: "arraybuffer" });
    var zip = new AdmZip(data.data);
    script.utils.mkdir(developmentPath);
    targetFiles.map((file) => {
      script.utils.log(`+${file}`);
      zip.extractEntryTo(file, developmentPath, undefined, true);
    });
    script.utils.log("complete");
  }
  return {
    name,
    productionPath: script.files.output.electron.resources.extraFiles + "/" + destPath,
    developmentPath,
    files: targetFiles,
  };
}
