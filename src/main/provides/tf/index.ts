import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
  imageTensorCache: { [id: string]: Tensor } = {};
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
    this.imageTensorCache[petaFile.id] = tensor;
    return tensor;
  }
  async loadImageVector(petaFile: PetaFile) {
    try {
      if (this.imageTensorCache[petaFile.id] !== undefined) {
        return this.imageTensorCache[petaFile.id];
      }
      const dirPath = getPetaFileDirectoryPath.fromPetaFile(petaFile).cache;
      this.imageTensorCache[petaFile.id] = tensorBuffer.toTensor(
        await readFile(resolve(dirPath, petaFile.id + ".tv")),
      );
      return this.imageTensorCache[petaFile.id];
    } catch {
      return undefined;
    }
  }
  async loadOrSaveImageVector(petaFile: PetaFile) {
    try {
      const loadedTensor = await this.loadImageVector(petaFile);
      if (loadedTensor !== undefined && !loadedTensor.isDisposed) {
        return loadedTensor;
      }
    } catch {
      //
    }
    return await this.saveImageVector(petaFile);
  }
  similarity(vecA: Tensor, vecB: Tensor) {
    return this.imageClassification.similarity(vecA, vecB);
  }
  async getSimilarPetaFileIDsByPetaFile(basePetaFile: PetaFile) {
    const baseTensor = await this.loadOrSaveImageVector(basePetaFile);
    const scores: { id: string; score: number }[] = [];
    await ppa(
      async (targetPetaFile, i) => {
        console.time(`simimg[${i}]`);
        const targetTensor = await this.loadOrSaveImageVector(targetPetaFile);
        scores.push({
          id: targetPetaFile.id,
          score: this.similarity(baseTensor, targetTensor),
        });
        console.timeEnd(`simimg[${i}]`);
      },
      usePetaFilesController().getAll(),
      CPU_LENGTH,
    ).promise;
    return scores.sort((a, b) => a.score - b.score).reverse();
  }
  async getSimilarPetaTags(petaFile: PetaFile) {
    const petaFiles = (await this.getSimilarPetaFileIDsByPetaFile(petaFile)).splice(1, 10);
    const allTags = await usePetaTagsController().getPetaTags();
    const tagScore: { [id: string]: number } = allTags.reduce((p, c) => ({ ...p, [c.id]: 0 }), {});
    await ppa(async (pf) => {
      const ids = await usePetaFilesPetaTagsController().getPetaTagIdsByPetaFileIds([pf.id]);
      ids.forEach((id) => {
        tagScore[id] += pf.score;
      });
    }, petaFiles).promise;
    const scores = Object.keys(tagScore)
      .filter((id) => tagScore[id] > 0)
      .map((id) => ({
        tagId: id,
        prob: tagScore[id],
        name: allTags.find((t) => t.id === id)?.name,
      }))
      .sort((a, b) => b.prob - a.prob);
    console.log(scores.map((s) => `${s.name}: ${s.prob}`).join("\n"));
    return scores;
  }
}
