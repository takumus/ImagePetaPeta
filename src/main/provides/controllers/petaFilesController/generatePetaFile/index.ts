import { FileTypeResult, fileTypeFromFile } from "file-type";
import * as Path from "path";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";

import * as file from "@/main/libs/file";
import { generateImageMetadataByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata";
import { generateVideoMetadata } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoMetadata";
import { useLogger } from "@/main/provides/utils/logger";

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
export async function generateMetadata(path: string): Promise<GeneratedFileInfo | undefined> {
  const filetype = await fileTypeFromFile(path);
  const logger = useLogger().logMainChunk();
  logger.log("#Generate Metadata", filetype?.mime);
  if (filetype !== undefined) {
    if (supportedFileConditions.image(filetype)) {
      return generateImageMetadataByWorker({
        buffer: await file.readFile(path),
        ext: filetype.ext,
      });
    }
    if (supportedFileConditions.video(filetype)) {
      return generateVideoMetadata(path, filetype.ext);
    }
  }
  return undefined;
}
export async function isSupportedFile(path: string) {
  const fileType = await fileTypeFromFile(path);
  if (fileType === undefined) {
    return false;
  }
  return Object.values(supportedFileConditions).reduce((supported: boolean, checker) => {
    if (supported) {
      return true;
    }
    return checker(fileType);
  }, false);
}
const supportedFileConditions = {
  image: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("image/");
  },
  video: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("video/");
  },
};
