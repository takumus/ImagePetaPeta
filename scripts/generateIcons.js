const script = require("./@script");
script.run("generate icons", async () => {
  const IconIco = require("@shockpkg/icon-encoder").IconIco;
  const sharp = require("sharp");
  const Path = require("path");
  async function exportImageWithMargin(from, to, size, margin) {
    const withYMargin = await sharp(from)
      .resize(size - margin * 2, size, {
        fit: "contain",
        background: "#00000000",
      })
      .toBuffer();
    const withXMargin = await sharp(withYMargin)
      .resize(size, size, {
        fit: "contain",
        background: "#00000000",
      })
      .toBuffer();
    return script.utils.write(to, withXMargin);
  }
  async function exportIcon(from, to, sizes) {
    const ico = new IconIco();
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const buf = await sharp(from).resize(size).toBuffer();
      ico.addFromPng(buf, false, false);
    }
    return script.utils.write(to, ico.encode());
  }
  script.utils.log(
    await exportIcon(
      "./rawAssets/icon/icon.png",
      Path.resolve(script.files.output.electron.resources.win.appIcon),
      [16, 32, 48, 64, 128, 256],
    ),
  );
  script.utils.log(
    await exportImageWithMargin(
      "./rawAssets/icon/icon.png",
      Path.resolve(script.files.output.electron.resources.mac.appIcon),
      512,
      50,
    ),
  );
});
