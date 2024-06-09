import { resolve } from "path";
import sharp from "sharp";

(async () => {
  const sizes = [16, 32, 48, 128];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    await sharp("../resources/images/app/icon.png")
      .resize(size)
      .toFile(resolve("./dist", `icon${size}.png`));
  }
})();
