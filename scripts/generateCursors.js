const script = require("./@script");
script.run("generate cursors", async (log) => {
  const sharp = require("sharp");
  const sizes = [22, 44];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    log(
      script.utils.write(
        `./src/@assets/rotateCursor${i + 1}x.png`,
        await sharp("./rawAssets/cursor/rotate.png").resize(size).toBuffer(),
      ),
    );
  }
});
