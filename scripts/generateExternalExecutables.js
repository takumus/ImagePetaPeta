const script = require("./@script");
var AdmZip = require("adm-zip");
const axios = require("axios").default;
script.run("generate external executables", async () => {
  const externals = [];
  externals.push(
    await add(
      "Real-ESRGAN",
      script.files.output.electron.resources.externalExecutables + "/realesrgan",
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
      "./src/@assets/externalExecutables.ts",
      Buffer.from(
        `export const externalExecutables = {\n` +
          externals
            .map((external) => {
              return (
                `  "${external.name}": {\n` +
                external.files
                  .map((file) => {
                    return `    "${file}": "${external.path}/${file}"`;
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
  try {
    script.utils.readdir(destPath);
    script.utils.log(`exists: ${destPath}`);
  } catch (err) {
    script.utils.log(`download: ${url}`);
    const data = await axios.get(url, { responseType: "arraybuffer" });
    var zip = new AdmZip(data.data);
    script.utils.mkdir(destPath);
    targetFiles.map((file) => {
      script.utils.log(`+${file}`);
      zip.extractEntryTo(file, destPath, undefined, true);
    });
    script.utils.log("complete");
  }
  return {
    name,
    path: destPath,
    files: targetFiles,
  };
}
