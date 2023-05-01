import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { dirname, extname, join, resolve } from "path";
import sharp from "sharp";

import { ppa } from "@/commons/utils/pp";

type Plugin = (filePath: string, destFilePath: string) => Promise<boolean>;

const cursorSizePlugin: Plugin = async (filePath, destFilePath) => {
  if (resolve(dirname(filePath)) === resolve("./resources/images/cursors")) {
    mkdirSync(resolve(dirname(destFilePath)), { recursive: true });
    const sizes = [22, 44];
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      await sharp(filePath)
        .resize(size)
        .toFile(resolve(dirname(destFilePath), `rotate${i + 1}x.png`));
    }
    return true;
  }
  return false;
};

const ignoreAppIconPlugin: Plugin = async (filePath) => {
  if (resolve(filePath) === resolve("./resources/images/app/icon.png")) {
    return true;
  }
  return false;
};

const defaultPlugin: Plugin = async (filePath, destFilePath) => {
  mkdirSync(resolve(dirname(destFilePath)), { recursive: true });
  copyFileSync(filePath, destFilePath);
  return true;
};

(async () => {
  const imagesRoot = "./resources/images";
  const destImagesRoot = "./src/_public/images";
  const extetions = ["png"];
  const plugins: Plugin[] = [cursorSizePlugin, ignoreAppIconPlugin, defaultPlugin];
  rmSync(resolve(destImagesRoot), { recursive: true, force: true });
  await ppa(async (dirName) => {
    const dirPath = join(imagesRoot, dirName);
    if (!statSync(dirPath).isDirectory()) {
      return;
    }
    const destDirPath = join(destImagesRoot, dirName);
    await ppa(async (fileName) => {
      if (!extetions.includes(extname(fileName).replace(/\./, "").toLowerCase())) {
        return;
      }
      const filePath = join(dirPath, fileName);
      const destFilePath = join(destDirPath, fileName);
      for (let i = 0; i < plugins.length; i++) {
        if (await plugins[i](filePath, destFilePath)) {
          break;
        }
      }
    }, readdirSync(dirPath)).promise;
  }, readdirSync(imagesRoot)).promise;
  console.log("done!");
})();
