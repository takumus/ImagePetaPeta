const task = require("./task");
const sharp = require("sharp");

task("generate cursors", async (log) => {
  const sizes = [22, 44];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    await sharp("./rawAssets/cursor/rotate.png")
      .resize(size)
      .toFile(`./src/@assets/rotateCursor${i + 1}x.png`);
    log(`cursor ${size}px`);
  }
});
