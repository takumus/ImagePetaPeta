import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { styleText } from "node:util";
import { IconIco } from "@shockpkg/icon-encoder";
import sharp from "sharp";

async function exportImageWithMargin(from: string, to: string, size: number, margin: number) {
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
  writeFileSync(to, withXMargin);
}
async function exportIcon(from: string, to: string, sizes: number[]) {
  const ico = new IconIco();
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = await sharp(from).resize(size).toBuffer();
    ico.addFromPng(buf, false, false);
  }
  writeFileSync(to, ico.encode());
}
(async () => {
  console.log(styleText(["bgCyan", "black"], " [BEGIN] Export icon "));
  await exportIcon(
    "./resources/images/app/icon.png",
    resolve("./_electronTemp/app_icon_win.ico"),
    [16, 32, 48, 64, 128, 256, 512],
  );
  await exportImageWithMargin(
    "./resources/images/app/icon.png",
    resolve("./_electronTemp/app_icon_mac.png"),
    512,
    50,
  );
  console.log(styleText(["bgCyan", "black"], " [END] Export icon "));
})();
