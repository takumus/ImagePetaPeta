const script = require("./@script");
script.run("generate icons", async (log) => {
  const IconIco = require("@shockpkg/icon-encoder").IconIco;
  const sharp = require("sharp");
  const Path = require("path");
  async function exportImage(from, to, size) {
    return script.utils.write(to, await sharp(from).resize(size).toBuffer());
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
  log(
    await exportIcon(
      "./rawAssets/icon/icon.png",
      Path.resolve(script.files.output.electron.resources.win.appIcon),
      [16, 32, 48, 64, 128, 256],
    ),
  );
  // log(
  //   await exportImage(
  //     "./rawAssets/icon/icon.png",
  //     Path.resolve(files.output.electron.resources.dir, "Square44x44Logo.png"),
  //     44,
  //   ),
  // );
  // log(
  //   await exportImage(
  //     "./rawAssets/icon/icon.png",
  //     Path.resolve(files.output.electron.resources.dir, "Square150x150Logo.png"),
  //     150,
  //   ),
  // );
  // log(
  //   await exportImage(
  //     "./rawAssets/icon/icon.png",
  //     Path.resolve(files.output.electron.resources.dir, "StoreLogo.png"),
  //     50,
  //   ),
  // );
  log(
    await exportImage(
      "./rawAssets/icon/icon.png",
      Path.resolve(script.files.output.electron.resources.mac.appIcon),
      512,
    ),
  );
});
