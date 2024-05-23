import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { layers, Sequential, sequential, stack, tensor, Tensor } from "@tensorflow/tfjs";

import { PetaFile } from "@/commons/datas/petaFile";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { ppa } from "@/commons/utils/pp";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { tensorBuffer } from "@/main/libs/tf/tensorBuffer";
import { TFImageClassification } from "@/main/libs/tf/tfImageClassification";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { getPetaFileDirectoryPath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";

export class TF {
  imageClassification = new TFImageClassification();
  imageVectorCache: { [id: string]: Tensor } = {};
  predictionModel: Sequential | undefined;
  async init() {
    return await this.imageClassification.init();
  }
  async saveImageVector(petaFile: PetaFile) {
    const imageBuffer = await streamToBuffer(getStreamFromPetaFile(petaFile, "thumbnail"));
    const tensor = stack(
      await Promise.all([
        this.imageClassification.imageToTensor(imageBuffer, 0),
        this.imageClassification.imageToTensor(imageBuffer, 1),
      ]),
    ); // [2, 1280]
    const dirPath = getPetaFileDirectoryPath.fromPetaFile(petaFile).cache;
    await mkdirIfNotIxists(dirPath, { recursive: true });
    await writeFile(resolve(dirPath, petaFile.id + ".tv"), tensorBuffer.toBuffer(tensor));
    this.imageVectorCache[petaFile.id] = tensor;
    return tensor;
  }
  async loadImageVector(petaFile: PetaFile) {
    try {
      if (this.imageVectorCache[petaFile.id] !== undefined) {
        return this.imageVectorCache[petaFile.id];
      }
      const dirPath = getPetaFileDirectoryPath.fromPetaFile(petaFile).cache;
      this.imageVectorCache[petaFile.id] = tensorBuffer
        .toTensor(await readFile(resolve(dirPath, petaFile.id + ".tv")))
        .reshape([2, 1280]); // [2, 1280]
      return this.imageVectorCache[petaFile.id];
    } catch {
      return undefined;
    }
  }
  async loadOrSaveImageVector(petaFile: PetaFile) {
    return (await this.loadImageVector(petaFile)) ?? (await this.saveImageVector(petaFile));
  }
  similarity(vecA: Tensor, vecB: Tensor) {
    return this.imageClassification.similarity(vecA, vecB);
  }
  async getSimilarPetaFileIDsByPetaFile(basePetaFile: PetaFile) {
    const baseTensor = await this.loadOrSaveImageVector(basePetaFile);
    const scores: { id: string; score: number }[] = [];
    await ppa(
      async (targetPetaFile, i) => {
        if (i % 100 === 0) console.log("id:", i);
        if (i % 100 === 0) console.time("s" + i);
        const targetTensor = await this.loadOrSaveImageVector(targetPetaFile);
        scores.push({
          id: targetPetaFile.id,
          score: this.similarity(baseTensor, targetTensor),
        });
        if (i % 100 === 0) console.timeEnd("s" + i);
      },
      Object.values(await usePetaFilesController().getAll()),
      CPU_LENGTH,
    ).promise;
    return scores.sort((a, b) => a.score - b.score).reverse();
  }
  async createTagModel() {
    if (this.predictionModel === undefined) {
      const allTags = await usePetaTagsController().getPetaTags();
      const allPetaFiles = Object.values(await usePetaFilesController().getAll());
      const tagIndex = allTags.map((t) => t.id);
      this.predictionModel = sequential();
      this.predictionModel.add(
        layers.dense({
          units: 512,
          activation: "relu",
          inputShape: [1280],
        }),
      );
      this.predictionModel.add(
        layers.dense({
          units: 256,
          activation: "relu",
        }),
      );
      this.predictionModel.add(
        layers.dense({
          units: 128,
          activation: "relu",
        }),
      );
      this.predictionModel.add(
        layers.dense({
          units: allTags.length,
          activation: "sigmoid",
        }),
      );
      this.predictionModel.compile({
        optimizer: "adam",
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });
      const imageVectors: Tensor[] = [];
      const tagVectors: Tensor[] = [];
      await ppa(
        async (pf, i) => {
          imageVectors.push(await this.loadOrSaveImageVector(pf));
          const tagVector = allTags.map(() => 0);
          (await usePetaFilesPetaTagsController().getPetaTagIdsByPetaFileIds([pf.id]))
            ?.map((id) => tagIndex.indexOf(id))
            .filter((index) => index >= 0)
            .forEach((index) => {
              tagVector[index] = 1;
            });
          console.log(i);
          tagVectors.push(tensor(tagVector));
        },
        allPetaFiles,
        CPU_LENGTH,
      ).promise;
      const xs = stack(imageVectors);
      const ys = stack(tagVectors);
      await this.predictionModel.fit(xs, ys, {
        epochs: 1,
        batchSize: 32,
      });
      const _fetch = fetch;
      global.fetch = async (...args: Parameters<typeof fetch>) => {
        if (args[0] === "http://save-to-local") {
          const fd = args[1]?.body as FormData;
          const files: File[] = [];
          fd.forEach((v) => {
            files.push(v as File);
          });
          await ppa(async (f) => {
            console.log(f.name, await f.arrayBuffer());
            if (f.name === "model.json") {
              console.log(Buffer.from(await f.arrayBuffer()).toString());
            }
          }, files).promise;
          return new Response();
        } else {
          return _fetch(...args);
        }
      };
      await this.predictionModel.save("http://save-to-local");
      // await this.predictionModel.save({
      //   async save(model): Promise<any> {
      //     console.log(model.);
      //     return {
      //       modelArtifactsInfo: {
      //         dateSaved: Date.now(),
      //         modelTopologyType: "JSON",
      //       },
      //     };
      //   },
      // });
    }
  }
  async getSimilarPetaTags(petaFile: PetaFile) {
    const baseVector = await this.loadOrSaveImageVector(petaFile);
    const allTags = await usePetaTagsController().getPetaTags();
    const tagIndex = allTags.map((t) => t.id);
    await this.createTagModel();
    const predictions = this.predictionModel!.predict(baseVector.reshape([1, 1280])) as Tensor;
    const probabilities = ((await predictions.array()) as number[][])[0];
    const predictedTags = probabilities.map((prob: number, index: number) => ({
      tagId: index,
      probability: prob,
    }));
    console.log("=========================================================");
    return await ppa(
      async (v) => {
        const tag = allTags.find((ttt) => ttt.id === tagIndex[v.tagId]);
        const ddd = {
          name: tag?.name!,
          tagId: tag?.id!,
          prob: v.probability,
        };
        console.log(ddd.prob.toFixed(2), ddd.name);
        return ddd;
      },
      predictedTags.sort((a, b) => b.probability - a.probability),
    ).promise;
  }
}
