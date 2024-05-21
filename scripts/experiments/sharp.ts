import sharp from "sharp";

(async () => {
  await sharp("./test/sampleDatas/dog.jpg")
    .modulate({ saturation: 0 })
    .toFile("./scripts/experiments/temp/dog.jpg");
})();
