import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stack, Tensor } from "@tensorflow/tfjs";

import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { ppa } from "@/commons/utils/pp";

import { provide } from "@/main/libs/di";
import { mkdirIfNotIxists } from "@/main/libs/file";
import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { tensorBuffer } from "@/main/libs/tf/tensorBuffer";
import { TFImageClassification } from "@/main/libs/tf/tfImageClassification";
import { configSecureFilePasswordKey } from "@/main/provides/configs";
import { Paths, pathsKey, usePaths } from "@/main/provides/utils/paths";
import { getPetaFileDirectoryPath } from "@/main/utils/getPetaFileDirectory";
import { createPetaFileReadStream } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";

type ToWorker =
  | {
      method: "init";
      id: number;
      args: { paths: Paths; tfModelPaths: { [key: string]: string }; secureKey: string };
    }
  | {
      method: "getSimilarPetaFileIDsByPetaFile";
      id: number;
      args: {
        basePetaFile: PetaFile;
        allPetaFiles: PetaFile[];
      };
    }
  | {
      method: "getSimilarPetaTags";
      id: number;
      args: {
        petaFile: PetaFile;
        allPetaFiles: PetaFile[];
        allPetaTags: PetaTag[];
        allPIPTs: PetaFilePetaTag[];
      };
    };
type ToMain =
  | { method: "init"; id: number; result: boolean }
  | {
      method: "getSimilarPetaFileIDsByPetaFile";
      id: number;
      result: {
        id: string;
        score: number;
      }[];
    }
  | {
      method: "getSimilarPetaTags";
      id: number;
      result: {
        tagId: string;
        prob: number;
        name: string | undefined;
      }[];
    };
export default initWorkerThreads<ToWorker, ToMain>((port) => {
  let tf: TF | undefined;
  port.on("message", async (params) => {
    if (params.method === "init") {
      if (tf == undefined) {
        provide(pathsKey, params.args.paths);
        provide(configSecureFilePasswordKey, {
          getKey() {
            return params.args.secureKey;
          },
        } as any);
        tf = new TF();
        await tf.init(params.args.tfModelPaths);
      }
      port.postMessage({ method: "init", result: true, id: params.id });
    } else if (params.method === "getSimilarPetaFileIDsByPetaFile") {
      const result =
        (await tf?.getSimilarPetaFileIDsByPetaFile(
          params.args.basePetaFile,
          params.args.allPetaFiles,
        )) ?? [];
      port.postMessage({ method: "getSimilarPetaFileIDsByPetaFile", result, id: params.id });
    } else if (params.method === "getSimilarPetaTags") {
      const result =
        (await tf?.getSimilarPetaTags(
          params.args.petaFile,
          params.args.allPetaFiles,
          params.args.allPetaTags,
          params.args.allPIPTs,
        )) ?? [];
      port.postMessage({ method: "getSimilarPetaTags", result, id: params.id });
    }
  });
});
class TF {
  imageClassification = new TFImageClassification();
  imageTensorCache: { [id: string]: Tensor } = {};
  async init(tfModelPaths: { [key: string]: string }) {
    return await this.imageClassification.init(tfModelPaths);
  }
  isInitialized() {
    return this.imageClassification.isInitialized();
  }
  private async saveImageVector(petaFile: PetaFile) {
    const imageBuffer = await streamToBuffer(createPetaFileReadStream(petaFile, "thumbnail"));
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
  private async loadImageVector(petaFile: PetaFile) {
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
  private async loadOrSaveImageVector(petaFile: PetaFile) {
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
  private similarity(vecA: Tensor, vecB: Tensor) {
    return this.imageClassification.similarity(vecA, vecB);
  }
  async getSimilarPetaFileIDsByPetaFile(basePetaFile: PetaFile, allPetaFiles: PetaFile[]) {
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
      allPetaFiles,
      CPU_LENGTH,
    ).promise;
    return scores.sort((a, b) => a.score - b.score).reverse();
  }
  async getSimilarPetaTags(
    petaFile: PetaFile,
    allPetaFiles: PetaFile[],
    allPetaTags: PetaTag[],
    allPIPTs: PetaFilePetaTag[],
  ) {
    const petaFiles = (await this.getSimilarPetaFileIDsByPetaFile(petaFile, allPetaFiles)).splice(
      1,
      10,
    );
    const tagScore: { [id: string]: number } = allPetaTags.reduce(
      (p, c) => ({ ...p, [c.id]: 0 }),
      {},
    );
    await ppa(async (pf) => {
      const ids = this.getPetaTagIdsByPetaFileIds([pf.id], allPIPTs);
      ids.forEach((id) => {
        tagScore[id] += pf.score;
      });
    }, petaFiles).promise;
    const scores = Object.keys(tagScore)
      .filter((id) => tagScore[id] > 0)
      .map((id) => ({
        tagId: id,
        prob: tagScore[id],
        name: allPetaTags.find((t) => t.id === id)?.name,
      }))
      .sort((a, b) => b.prob - a.prob);
    console.log(scores.map((s) => `${s.name}: ${s.prob}`).join("\n"));
    return scores;
  }
  getPetaTagIdsByPetaFileIds(petaFileIds: string[], allPIPTs: PetaFilePetaTag[]) {
    const pipts = allPIPTs.filter((pipt) => petaFileIds.includes(pipt.petaFileId));
    const ids = Array.from(
      new Set(
        pipts.map((pipt) => {
          return pipt.petaTagId;
        }),
      ),
    );
    const petaTagIds = ids.filter((id) => {
      return (
        pipts.filter((pipt) => {
          return pipt.petaTagId === id;
        }).length === petaFileIds.length
      );
    });
    return petaTagIds;
  }
}
