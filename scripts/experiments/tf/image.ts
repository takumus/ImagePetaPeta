import sharp from "sharp";

process.env.NODE_ENV = "development";
(async () => {
  const { TFImageClassification } = await import("@/main/libs/tf/tfImageClassification");
  const tfic = new TFImageClassification();
  await tfic.init();
  const tensor1 = await tfic.imageToTensor("./test/sampleDatas/dog.jpg");
  const tensor2 = await tfic.imageToTensor("./test/sampleDatas/bird.png");
  // console.log(tensor1, tensor2);
  console.log(tensor1, tensor2, tfic.similarity(tensor1, tensor2));
  // const squeezedTensor = tensor1.squeeze([0]);

  // // テンソルの値を0-255の範囲にスケール
  // const scaledTensor = squeezedTensor.mul(255).cast("int32");

  // // テンソルをUint8Arrayに変換
  // const data = await scaledTensor.data();
  // // Sharpを使って画像として保存
  // await sharp(new Uint8Array(data), {
  //   raw: {
  //     width: 224,
  //     height: 224,
  //     channels: 3,
  //   },
  // }).toFile("./scripts/experiments/temp/a.png");
})();
