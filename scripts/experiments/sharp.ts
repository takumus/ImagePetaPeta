import { readdirSync } from "fs";
import sharp from "sharp";

import { ppa } from "@/commons/utils/pp";

(async () => {
  const noise = Buffer.alloc(224 * 224 * 3);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.round(0xff * Math.random());
  }
  await ppa(
    async (file) => {
      const img1 = await createImage(`./test/sampleDatas/${file}`, 0);
      sharp(img1.data, { raw: img1.info }).toFile(
        `./scripts/experiments/temp/${file[0] + 0}${file}`,
      );
      const img2 = await createImage(`./test/sampleDatas/${file}`, 1);
      sharp(img2.data, { raw: img2.info }).toFile(
        `./scripts/experiments/temp/${file[0] + 1}${file}`,
      );
    },
    readdirSync("./test/sampleDatas").filter((f) => f.match(/(\.png)|(\.jpg)/)),
  ).promise;
})();
async function createImage(source: string | Buffer, type: 0 | 1) {
  return await sharp(
    await sharp(source)
      .resize(224, 224, {
        fit: "cover",
        position: type === 0 ? sharp.strategy.attention : sharp.strategy.entropy,
      })
      .ensureAlpha(1)
      .toBuffer(),
  )
    .raw()
    .removeAlpha()
    .toBuffer({ resolveWithObject: true });
}
