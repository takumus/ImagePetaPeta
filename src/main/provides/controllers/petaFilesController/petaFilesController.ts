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
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
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
    const update = async (data: PetaFile, index: number) => {
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
    };
    await ppa(update, datas).promise;
    if (mode === UpdateMode.REMOVE) {
      // Tileの更新対象なし
      windows.emitMainEvent(
        {
          type: EmitMainEventTargetType.WINDOW_NAMES,
          windowNames: ["board", "browser", "details"],
        },
        "updatePetaTags",
        {
          petaFileIds: [],
          petaTagIds: [],
        },
      );
    }
    windows.emitMainEvent(
      {
        type: EmitMainEventTargetType.WINDOW_NAMES,
        windowNames: ["board", "browser", "details"],
      },
      "updatePetaFiles",
      datas,
      mode,
    );
    task.emitStatus({
      i18nKey: "tasks.updateDatas",
      log: [],
      status: "complete",
    });
  }
  async getPetaFile(id: string) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFile = (await dbPetaFiles.find({ id }))[0];
    if (petaFile === undefined) {
      return undefined;
    }
    return petaFile;
  }
  async getAll() {
    const dbPetaFiles = useDBPetaFiles();
    const data = dbPetaFiles.getAll();
    const petaFiles: PetaFiles = {};
    data.forEach((pi) => {
      petaFiles[pi.id] = pi;
    });
    return petaFiles;
  }
  private async update(petaFile: PetaFile, mode: UpdateMode) {
    const dbPetaFiles = useDBPetaFiles();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("##Update PetaFile");
    log.debug("mode:", mode);
    log.debug("image:", minimizeID(petaFile.id));
    if (mode === UpdateMode.REMOVE) {
      await petaFilesPetaTagsController.remove(petaFile.id, "petaFileId");
      await dbPetaFiles.remove({ id: petaFile.id });
      const path = getPetaFilePath.fromPetaFile(petaFile);
      await rm(path.original).catch(() => {
        //
      });
      await rm(path.thumbnail).catch(() => {
        //
      });
    } else if (mode === UpdateMode.UPDATE) {
      await dbPetaFiles.update({ id: petaFile.id }, petaFile);
    } else {
      await dbPetaFiles.insert(petaFile);
    }
    return true;
  }
  async regeneratePetaFiles() {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regeneratePetaFilesBegin");
    const petaFiles = Object.values(await this.getAll());
    let completed = 0;
    const generate = async (petaFile: PetaFile) => {
      const newPetaFile = await regeneratePetaFile(petaFile);
      if (newPetaFile === undefined) {
        return;
      }
      await this.update(newPetaFile, UpdateMode.UPDATE);
      log.debug(`thumbnail (${++completed} / ${petaFiles.length})`);
      windows.emitMainEvent(
        { type: EmitMainEventTargetType.ALL },
        "regeneratePetaFilesProgress",
        completed,
        petaFiles.length,
      );
    };
    await ppa((pf) => generate(pf), petaFiles, CPU_LENGTH).promise;
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "regeneratePetaFilesComplete");
  }
  async verifyFiles() {
    const petaFiles = Object.values(await this.getAll());
    usePetaFilesPetaTagsController();
    let brokenPetaTag = (await usePetaTagsController().getPetaTags()).find(
      (p) => p.name === "broken",
    );
    if (brokenPetaTag === undefined) {
      await usePetaTagsController().updateMultiple(
        [
          {
            type: "name",
            name: "broken",
          },
        ],
        UpdateMode.INSERT,
      );
      brokenPetaTag = (await usePetaTagsController().getPetaTags()).find(
        (p) => p.name === "broken",
      );
    }
    if (brokenPetaTag === undefined) {
      return;
    }
    (await usePetaTagsController().getPetaTags()).find((p) => p.name === "broken");
    const errorIDs: string[] = [];
    let count = 0;
    const verify = async (petaFile: PetaFile) => {
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
    };
    await ppa((pf) => verify(pf), petaFiles, CPU_LENGTH).promise;
    await usePetaFilesPetaTagsController().updatePetaFilesPetaTags(
      errorIDs,
      [{ type: "id", id: brokenPetaTag.id }],
      UpdateMode.INSERT,
      true,
    );
    console.log("error:", errorIDs.length, "/", petaFiles.length);
  }
  async encryptAll(mode: keyof typeof secureFile) {
    const petaFiles = Object.values(await this.getAll()).filter(
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
          this.update(pf, UpdateMode.UPDATE);
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
  async removeTrashs() {
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
}
export const petaFilesControllerKey = createKey<PetaFilesController>("petaFilesController");
export const usePetaFilesController = createUseFunction(petaFilesControllerKey);
