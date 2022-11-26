import * as Path from "path";

import { PetaFile } from "@/commons/datas/petaFile";

import * as file from "@/main/libs/file";
import { addFile } from "@/main/provides/controllers/petaFilesController/generatePetaFile/addFile";

export async function generatePetaFile(param: {
  path: string;
  extends: Partial<PetaFile> & { id: string };
  dirOriginals: string;
  dirThumbnails: string;
  type: "update" | "add";
}): Promise<PetaFile> {
  const fileInfo = await addFile(param.path);
  if (fileInfo === undefined) {
    throw new Error("unsupported file");
  }
  const originalFileName = `${param.extends.id}.${fileInfo.extention}`; // xxxxxxxx.png
  const thumbnailFileName = `${param.extends.id}.${fileInfo.extention}.${fileInfo.thumbnail.extention}`; // xxxxxxxx.png.webp
  const petaFile: PetaFile = {
    id: param.extends.id,
    file: {
      original: originalFileName,
      thumbnail: thumbnailFileName,
    },
    name: param.extends.name ?? "",
    note: param.extends.note ?? "",
    fileDate: param.extends.fileDate ?? new Date().getTime(),
    addDate: param.extends.addDate ?? new Date().getTime(),
    nsfw: param.extends.nsfw ?? false,
    metadata: fileInfo.metadata,
  };
  if (param.type === "add") {
    await file.copyFile(param.path, Path.resolve(param.dirOriginals, originalFileName));
  }
  if (param.type === "update") {
    const to = Path.resolve(param.dirOriginals, originalFileName);
    if (param.path !== to) {
      console.log("move:", param.path, to);
      await file.moveFile(param.path, Path.resolve(param.dirOriginals, originalFileName));
    }
  }
  await file.writeFile(
    Path.resolve(param.dirThumbnails, thumbnailFileName),
    fileInfo.thumbnail.buffer,
  );
  return petaFile;
}
