import { fileTypeFromFile } from "file-type";
import { copyFile, readFile, rename, writeFile } from "fs/promises";
import * as Path from "path";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { generateImageMetadataByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata";
import { generateVideoMetadata } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoMetadata";
import { useLogger } from "@/main/provides/utils/logger";
import { supportedFileConditions } from "@/main/utils/supportedFileTypes";

export async function generatePetaFile(param: {
  path: string;
  extends: Partial<PetaFile> & { id: string };
  dirOriginals: string;
  dirThumbnails: string;
  type: "update" | "add";
}): Promise<PetaFile> {
  const logger = useLogger().logMainChunk();
  logger.log("#Generate PetaFile");
  const fileInfo = await generateMetadata(param.path);
  if (fileInfo === undefined) {
    throw new Error("unsupported file");
  }
  const originalFileName = `${param.extends.id}.${fileInfo.original.extention}`; // xxxxxxxx.png
  const thumbnailFileName = `${param.extends.id}.${fileInfo.original.extention}.${fileInfo.thumbnail.extention}`; // xxxxxxxx.png.webp
  await mkdirIfNotIxists(param.dirOriginals, { recursive: true });
  await mkdirIfNotIxists(param.dirThumbnails, { recursive: true });
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
    mimeType: fileInfo.original.mimeType,
    nsfw: param.extends.nsfw ?? false,
    metadata: fileInfo.metadata,
  };
  if (param.type === "add") {
    await copyFile(param.path, Path.resolve(param.dirOriginals, originalFileName));
  }
  if (param.type === "update") {
    const to = Path.resolve(param.dirOriginals, originalFileName);
    if (param.path !== to) {
      console.log("move:", param.path, to);
      await rename(param.path, Path.resolve(param.dirOriginals, originalFileName));
    }
  }
  await writeFile(Path.resolve(param.dirThumbnails, thumbnailFileName), fileInfo.thumbnail.buffer);
  return petaFile;
}
export async function generateMetadata(path: string): Promise<GeneratedFileInfo | undefined> {
  const fileType = await fileTypeFromFile(path);
  const logger = useLogger().logMainChunk();
  logger.log("#Generate Metadata", fileType?.mime);
  if (fileType !== undefined) {
    if (supportedFileConditions.image(fileType)) {
      return generateImageMetadataByWorker({
        buffer: await readFile(path),
        fileType: fileType,
      });
    }
    if (supportedFileConditions.video(fileType)) {
      return generateVideoMetadata(path, fileType);
    }
  }
  return undefined;
}
