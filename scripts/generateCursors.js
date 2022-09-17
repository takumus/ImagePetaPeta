const script = require("./@script");
script.run("generate cursors", async () => {
  const sharp = require("sharp");
  const sizes = [22, 44];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    script.utils.log(
      script.utils.write(
        `./src/@assets/rotateCursor${i + 1}x.png`,
        await sharp("./resources/cursor/rotate.png").resize(size).toBuffer(),
      ),
    );
  }
});
