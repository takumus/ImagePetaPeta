const fs = require("fs");
const IconIco = require('@shockpkg/icon-encoder').IconIco;
const sharp = require("sharp");

(async () => {
  console.log("generate icons");
  const ico = new IconIco();
  const sizes = [16, 32, 48, 64, 128, 256];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = await sharp("./rawAssets/icon/icon.png")
    .resize(size)
    .toBuffer();
    ico.addFromPng(buf, false, false);
  }
  fs.writeFileSync('./build/icon.ico', ico.encode());
  console.log(`./build/icon.ico`);
  await exportImage("./rawAssets/icon/icon.png", "./build/Square44x44Logo.png", 44);
  await exportImage("./rawAssets/icon/icon.png", "./build/Square150x150Logo.png", 150);
  await exportImage("./rawAssets/icon/icon.png", "./build/StoreLogo.png", 50);
  await exportImage("./rawAssets/icon/icon.png", "./build/MacIcon.png", 512);
  // button icons
  const buttonIcons = fs.readdirSync("./rawAssets/buttonIcons");
  buttonIcons.forEach((path) => {
    if (!fs.statSync(`./rawAssets/buttonIcons/${path}`).isDirectory()) {
      return;
    }
    fs.copyFileSync(`./rawAssets/buttonIcons/${path}/${path}.svg`, `./src/@assets/${path}.svg`);
  })
  console.log("generate icons complete");
})();

async function exportImage(from, to, size) {
  await sharp(from)
  .resize(size)
  .toFile(to);
  console.log(to);
}