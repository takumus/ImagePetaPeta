import sharp from "sharp";

(async () => {
  const noise = Buffer.alloc(224 * 224 * 3);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.round(0xff * Math.random());
  }
  const img = await createImageForTensor("./test/sampleDatas/cat.png");
  sharp(img.data, { raw: img.info }).toFile("./scripts/experiments/temp/dog.png");
})();

async function createImageForTensor(source: string | Buffer) {
  const noise = Buffer.alloc(224 * 224 * 3);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.round(0xff * Math.random());
  }
  const img = await sharp(source)
    .resize(200, 200, {
      fit: "inside",
    })
    .toBuffer();
  return await sharp(noise, { raw: { width: 224, height: 224, channels: 3 } })
    .composite([
      {
        input: img,
      },
    ])
    .raw()
    .removeAlpha()
    .toBuffer({ resolveWithObject: true });
}
