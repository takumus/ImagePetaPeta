const fs = require("fs");
const IconIco = require('@shockpkg/icon-encoder').IconIco;
const sharp = require("sharp");

(async () => {
  console.log("generate icons");
  const ico = new IconIco();
  const sizes = [16, 32, 48, 64, 128, 256];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = await sharp("./icon/icon.png")
    .resize(size)
    .toBuffer();
    ico.addFromPng(buf, false, false);
    console.log(`icon ${size}x`);
  }
  fs.writeFileSync('./build/icon.ico', ico.encode());
  console.log("generate icons complete");
})();