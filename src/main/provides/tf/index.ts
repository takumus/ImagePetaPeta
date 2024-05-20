import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { layers, Sequential, sequential, stack, tensor, Tensor } from "@tensorflow/tfjs";

import { PetaFile } from "@/commons/datas/petaFile";
import { ppa } from "@/commons/utils/pp";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { LibTF } from "@/main/libs/tf";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { getPetaFileDirectoryPath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";

export class TF {
  libTF = new LibTF();
  imageVectorCache: { [id: string]: Tensor } = {};
  predictionModel: Sequential | undefined;
  async init() {
    return await this.libTF.init();
  }
  async updateImageVector(petaFile: PetaFile) {
    const imageBuffer = await streamToBuffer(getStreamFromPetaFile(petaFile, "thumbnail"));
    const vector = await this.libTF.imageToVector(imageBuffer);
    const vectorBuffer = this.libTF.vectorToBuffer(vector);
    const dirPath = getPetaFileDirectoryPath.fromPetaFile(petaFile).cache;
    const filePath = resolve(dirPath, petaFile.id + ".tv");
    await mkdirIfNotIxists(dirPath, { recursive: true });
    await writeFile(filePath, vectorBuffer);
    this.imageVectorCache[petaFile.id] = vector;
    return vector;
  }
  async getImageVector(petaFile: PetaFile) {
    try {
      if (this.imageVectorCache[petaFile.id] !== undefined) {
        return this.imageVectorCache[petaFile.id];
      }
      const dirPath = getPetaFileDirectoryPath.fromPetaFile(petaFile).cache;
      const filePath = resolve(dirPath, petaFile.id + ".tv");
      const vectorBuffer = await readFile(filePath);
      this.imageVectorCache[petaFile.id] = this.libTF.bufferToVector(vectorBuffer);
      return this.imageVectorCache[petaFile.id];
    } catch {
      return undefined;
    }
  }
  async getOrUpdateImageVector(petaFile: PetaFile) {
    return (await this.getImageVector(petaFile)) ?? (await this.updateImageVector(petaFile));
  }
  similarity(vecA: Tensor, vecB: Tensor) {
    return this.libTF.similarity(vecA, vecB);
  }
  async getSimilarPetaFileIDsByPetaFile(basePetaFile: PetaFile) {
    const baseVec = await this.getOrUpdateImageVector(basePetaFile);
    const scores: { id: string; score: number }[] = [];
    await ppa(
      async (targetPetaFile, i) => {
        if (i % 100 === 0) console.log("id:", i);
        if (i % 100 === 0) console.time("s");
        const targetVec = await this.getOrUpdateImageVector(targetPetaFile);
        scores.push({
          id: targetPetaFile.id,
          score: this.similarity(baseVec, targetVec),
        });
        if (i % 100 === 0) console.timeEnd("s");
        // tv.dispose();
      },
      Object.values(await usePetaFilesController().getAll()),
    ).promise;
    return scores.sort((a, b) => a.score - b.score).reverse();
  }
  async createTagModel() {
    const allTags = await usePetaTagsController().getPetaTags();
    const allPetaFiles = Object.values(await usePetaFilesController().getAll());
    const tagIndex = allTags.map((t) => t.id);
    if (this.predictionModel === undefined) {
      this.predictionModel = sequential();
      this.predictionModel.add(
        layers.dense({
          units: 256,
          activation: "relu",
          inputShape: [1280],
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
      await ppa(async (pf) => {
        imageVectors.push(await this.getOrUpdateImageVector(pf));
        const tagVector = allTags.map(() => 0);
        const tagIDs = await usePetaFilesPetaTagsController().getPetaTagIdsByPetaFileIds([pf.id]);
        tagIDs
          .map((id) => tagIndex.indexOf(id))
          .filter((index) => index >= 0)
          .forEach((index) => {
            tagVector[index] = 1;
          });
        tagVectors.push(tensor(tagVector));
      }, allPetaFiles).promise;
      const xs = stack(imageVectors);
      const ys = stack(tagVectors);
      await this.predictionModel?.fit(xs, ys, {
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
    const baseVector = await this.getOrUpdateImageVector(petaFile);
    const allTags = await usePetaTagsController().getPetaTags();
    const tagIndex = allTags.map((t) => t.id);
    await this.createTagModel();
    const predictions = this.predictionModel!.predict(baseVector.reshape([1, 1280])) as Tensor;
    const probabilities = ((await predictions.array()) as number[][])[0];
    const predictedTags = probabilities.map((prob: number, index: number) => ({
      tagId: index,
      probability: prob,
    }));
    console.log(
      await ppa(
        async (v) => {
          const ddd = {
            tn: allTags.find((ttt) => ttt.id === tagIndex[v.tagId])?.name!,
            prob: Math.floor(v.probability * 100) + "%",
          };
          return ddd;
        },
        predictedTags.sort((a, b) => b.probability - a.probability),
      ).promise,
    );
  }
}
