import { rename, rm, stat } from "node:fs/promises";
import * as Path from "node:path";
import { fileTypeFromStream } from "file-type";
import { v4 as uuid } from "uuid";

import { PetaFile, PetaFiles } from "@/commons/datas/petaFile";
import { UpdateMode } from "@/commons/datas/updateMode";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { createKey, createUseFunction } from "@/main/libs/di";
import * as file from "@/main/libs/file";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { regeneratePetaFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBPetaFiles } from "@/main/provides/databases";
import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useWindows } from "@/main/provides/windows";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile, secureFile } from "@/main/utils/secureFile";

export class PetaFilesController {
  public async updateMultiple(datas: PetaFile[], mode: UpdateMode, silent = false) {
    const tasks = useTasks();
    const windows = useWindows();
    const task = tasks.spawn("UpdatePetaFiles", silent);
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      log: [],
      status: "begin",
    });
    await ppa(async (data: PetaFile, index: number) => {
      await this.update(data, mode);
      task.emitStatus({
        i18nKey: "tasks.updateDatas",
        progress: {
          all: datas.length,
          current: index + 1,
        },
        log: [data.id],
        status: "progress",
      });
    }, datas).promise;
    if (mode === "remove") {
      // Tileの更新対象なし
      windows.emit.petaTags.update(
        {
          type: "windowNames",
          windowNames: ["board", "browser", "details"],
        },
        {
          petaFileIds: [],
          petaTagIds: [],
        },
      );
    }
    windows.emit.petaFiles.update(
      {
        type: "windowNames",
        windowNames: ["board", "browser", "details"],
      },
      datas,
      mode,
    );
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      log: [],
      status: "complete",
    });
  }
  public async getPetaFile(id: string) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFile = (await dbPetaFiles.find({ id }))[0];
    if (petaFile === undefined) {
      return undefined;
    }
    return petaFile;
  }
  public getAllAsMap() {
    const dbPetaFiles = useDBPetaFiles();
    const data = dbPetaFiles.getAll();
    const petaFiles: PetaFiles = {};
    data.forEach((pi) => {
      petaFiles[pi.id] = pi;
    });
    return petaFiles;
  }
  public getAll() {
    const dbPetaFiles = useDBPetaFiles();
    return dbPetaFiles.getAll();
  }
  public async regenerate() {
    const windows = useWindows();
    const log = useLogger().logChunk("PetaFilesController.regenerate");
    windows.emit.petaFiles.regenerateBegin({ type: "all" });
    const petaFiles = this.getAll();
    let completed = 0;
    await ppa(
      async (petaFile: PetaFile) => {
        const newPetaFile = await regeneratePetaFile(petaFile);
        if (newPetaFile === undefined) {
          return;
        }
        await this.update(newPetaFile, "update");
        log.debug(`thumbnail (${++completed} / ${petaFiles.length})`);
        windows.emit.petaFiles.regenerateProgress({ type: "all" }, completed, petaFiles.length);
      },
      petaFiles,
      CPU_LENGTH,
    ).promise;
    windows.emit.petaFiles.regenerateComplete({ type: "all" });
  }
  public async verifyFiles() {
    const petaFiles = this.getAll();
    usePetaFilesPetaTagsController();
    let brokenPetaTag = (await usePetaTagsController().getAll()).find((p) => p.name === "broken");
    if (brokenPetaTag === undefined) {
      await usePetaTagsController().updateMultiple(
        [
          {
            type: "name",
            name: "broken",
          },
        ],
        "insert",
      );
      brokenPetaTag = (await usePetaTagsController().getAll()).find((p) => p.name === "broken");
    }
    if (brokenPetaTag === undefined) {
      return;
    }
    (await usePetaTagsController().getAll()).find((p) => p.name === "broken");
    const errorIDs: string[] = [];
    let count = 0;
    await ppa(
      async (petaFile: PetaFile) => {
        try {
          const paths = getPetaFilePath.fromPetaFile(petaFile);
          await stat(paths.original);
          await stat(paths.thumbnail);
          if (
            (await fileTypeFromStream(getStreamFromPetaFile(petaFile, "original")))?.mime !==
            petaFile.metadata.mimeType
          ) {
            throw "original is broken";
          }
          if (
            (await fileTypeFromStream(getStreamFromPetaFile(petaFile, "thumbnail")))?.mime !==
            "image/webp"
          ) {
            throw "thumb is broken";
          }
        } catch (err) {
          errorIDs.push(petaFile.id);
        }
        console.log(++count, "/", petaFiles.length);
      },
      petaFiles,
      CPU_LENGTH,
    ).promise;
    await usePetaFilesPetaTagsController().updatePetaFilesPetaTags(
      errorIDs,
      [{ type: "id", id: brokenPetaTag.id }],
      "insert",
      true,
    );
    console.log("error:", errorIDs.length, "/", petaFiles.length);
  }
  public async encryptAll(mode: keyof typeof secureFile) {
    const petaFiles = this.getAll().filter(
      (pf) => (mode === "encrypt" && !pf.encrypted) || (mode === "decrypt" && pf.encrypted),
    );
    const key = useConfigSecureFilePassword().getKey();
    let completed = 0;
    await ppa(
      async (pf, i) => {
        const pathOrg = getPetaFilePath.fromPetaFile(pf);
        const pathTemp = {
          original: Path.resolve(usePaths().DIR_TEMP, uuid()),
          thumbnail: Path.resolve(usePaths().DIR_TEMP, uuid()),
        };
        try {
          let k: keyof typeof pathOrg;
          for (k in pathOrg) {
            await secureFile[mode].toFile(pathOrg[k], pathTemp[k], key);
            await rename(pathTemp[k], pathOrg[k]);
          }
          pf.encrypted = mode === "encrypt";
          this.update(pf, "update");
        } catch (e) {
          console.log(e);
        }
        console.log(pf.id, i);
        completed++;
        console.log(completed, "/", petaFiles.length);
      },
      petaFiles,
      CPU_LENGTH,
    ).promise;
    console.log("complete");
  }
  public async removeTrashs() {
    const files = (
      await Promise.all([
        file.readDirRecursive(usePaths().DIR_IMAGES).files,
        file.readDirRecursive(usePaths().DIR_THUMBNAILS).files,
      ])
    ).reduce((p, c) => [...p, ...c], []);
    await ppa(async (path) => {
      const id = /([^\.]*)/.exec(Path.basename(path))?.[0];
      const dir1 = Path.basename(Path.dirname(Path.dirname(path)));
      const dir2 = Path.basename(Path.dirname(path));
      if (id !== undefined && id.startsWith(dir1 + dir2)) {
        if ((await this.getPetaFile(id)) === undefined) {
          console.log("remove");
        }
      }
    }, files).promise;
  }
  private async update(petaFile: PetaFile, mode: UpdateMode) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const log = useLogger().logChunk("PetaFilesController.update");
    log.debug("mode:", mode);
    log.debug("image:", minimizeID(petaFile.id));
    if (mode === "remove") {
      await petaFilesPetaTagsController.remove(petaFile.id, "petaFileId");
      await dbPetaFiles.remove({ id: petaFile.id });
      const path = getPetaFilePath.fromPetaFile(petaFile);
      await rm(path.original).catch(() => {
        //
      });
      await rm(path.thumbnail).catch(() => {
        //
      });
    } else if (mode === "update") {
      await dbPetaFiles.update({ id: petaFile.id }, petaFile);
    } else {
      await dbPetaFiles.insert(petaFile);
    }
    return true;
  }
}
export const petaFilesControllerKey = createKey<PetaFilesController>("petaFilesController");
export const usePetaFilesController = createUseFunction(petaFilesControllerKey);
