const task = require("./@task");
const fs = require("fs");
const IconIco = require("@shockpkg/icon-encoder").IconIco;
const sharp = require("sharp");
const files = require("../files.config");
const Path = require("path");
task("generate icons", async (log) => {
  log(
    await exportIcon(
      "./rawAssets/icon/icon.png",
      Path.resolve(files.out.resourcesDir, "WindowsIcon.ico"),
      [16, 32, 48, 64, 128, 256],
    ),
  );
  log(await exportImage("./rawAssets/icon/icon.png", Path.resolve(files.out.resourcesDir, "Square44x44Logo.png"), 44));
  log(
    await exportImage("./rawAssets/icon/icon.png", Path.resolve(files.out.resourcesDir, "Square150x150Logo.png"), 150),
  );
  log(await exportImage("./rawAssets/icon/icon.png", Path.resolve(files.out.resourcesDir, "StoreLogo.png"), 50));
  log(await exportImage("./rawAssets/icon/icon.png", Path.resolve(files.out.resourcesDir, "MacIcon.png"), 512));
});

async function exportImage(from, to, size) {
  await sharp(from).resize(size).toFile(to);
  return to;
}
async function exportIcon(from, to, sizes) {
  const ico = new IconIco();
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = await sharp(from).resize(size).toBuffer();
    ico.addFromPng(buf, false, false);
  }
  fs.writeFileSync(to, ico.encode());
  return to;
}
