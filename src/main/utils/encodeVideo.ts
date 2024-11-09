import * as Path from "node:path";
import { shell } from "electron";

import { PetaFile } from "@/commons/datas/petaFile";
import { ppa } from "@/commons/utils/pp";

import { useTasks } from "@/main/provides/tasks";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { runExternalApplication } from "@/main/utils/runExternalApplication";

export async function encodeVideo(petaFiles: PetaFile[], args: string[]) {
  const paths = usePaths();
  const tasks = useTasks();
  const task = tasks.spawn("encodeVideo", false);
  const log = useLogger().logChunk("encodeVideo");
  let success = true;
  const newPetaFiles: PetaFile[] = [];
  task.emitStatus({
    i18nKey: "tasks.encoding",
    log: [petaFiles.length.toString()],
    status: "begin",
    cancelable: true,
  });
  const processes = ppa(
    async (petaFile, index) => {
      const inputFile = getPetaFilePath.fromPetaFile(petaFile).original;
      const outputFile = `${Path.resolve(paths.DIR_TEMP, petaFile.id)}.mp4`;
      const parameters = [
        "-i",
        inputFile,
        "-b:v",
        "5000k",
        "-c:a",
        "copy",
        outputFile,
        "-progress",
        "-",
        "-nostats",
      ];
      let percent = 0;
      let duration = 0;
      await runExternalApplication(
        "ffprobe.exe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          inputFile,
        ],
        "utf8",
        (l) => {
          const d = Number(l.trim());
          if (!isNaN(d)) {
            duration = d;
          }
        },
      ).promise;
      const childProcess = runExternalApplication("ffmpeg.exe", parameters, "utf8", (l) => {
        l = l.trim();
        const d = Number(l.split("out_time_ms=")?.[1]?.split("\n")?.[0]);
        percent = !isNaN(d) ? d : percent;
        log.debug(l);
        task.emitStatus({
          i18nKey: "tasks.encoding",
          progress: {
            all: petaFiles.length,
            current: index + percent / (duration * 1000000),
          },
          log: [l],
          status: "progress",
          cancelable: true,
        });
      });
      task.onCancel = () => {
        childProcess.kill();
        processes.cancel();
      };
      task.emitStatus({
        i18nKey: "tasks.encoding",
        progress: {
          all: petaFiles.length,
          current: index,
        },
        log: [[...parameters].join(" ")],
        status: "progress",
        cancelable: true,
      });
      const result = await childProcess.promise;
      if (result) {
        // const newPetaFile = await importImage(
        //   outputFile,
        //   petaFile,
        //   `${petaFile.name}(encodeVideo-${modelName})`,
        // );
        // if (newPetaFile !== undefined) {
        //   success = true;
        //   newPetaFiles.push(newPetaFile);
        // }
        shell.showItemInFolder(outputFile);
      } else {
        success = false;
      }
    },
    petaFiles,
    1,
  );
  await processes.promise;
  task.emitStatus({
    i18nKey: "tasks.encoding",
    log: [],
    status: success ? "complete" : "failed",
  });
  return newPetaFiles;
}
