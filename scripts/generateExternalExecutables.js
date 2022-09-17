const script = require("./@script");
var AdmZip = require("adm-zip");
const axios = require("axios").default;
script.run("generate external executables", async () => {
  await download(
    "Real-ESRGAN",
    "./resources/realesrgan",
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
  );
});

async function download(name, destPath, targetFiles, url) {
  script.utils.log(name);
  try {
    script.utils.readdir(destPath);
    script.utils.log(`exists: ${destPath}`);
    return;
  } catch (err) {
    script.utils.log(`download: ${url}`);
  }
  const data = await axios.get(url, { responseType: "arraybuffer" });
  var zip = new AdmZip(data.data);
  script.utils.mkdir(destPath);
  targetFiles.map((file) => {
    script.utils.log(`+${file}`);
    zip.extractEntryTo(file, destPath, undefined, true);
  });
  script.utils.log("complete");
}
