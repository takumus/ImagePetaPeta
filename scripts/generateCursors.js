const sharp = require("sharp");

(async () => {
  console.log("generate cursors");
  const sizes = [22, 44];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    await sharp("./rawAssets/cursor/rotate.png")
    .resize(size)
    .toFile(`./src/@assets/rotateCursor${ i + 1 }x.png`);
    console.log(`cursor ${size}px`);
  }
  console.log("generate cursors complete");
})();