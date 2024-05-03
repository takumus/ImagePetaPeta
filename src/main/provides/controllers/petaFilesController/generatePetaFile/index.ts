import { copyFile, readFile, rename, rm, writeFile } from "fs/promises";
import * as Path from "path";
import { fileTypeFromFile } from "file-type";
import { v4 as uuid } from "uuid";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { generateImageMetadataByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata";
import { generateVideoMetadata } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoMetadata";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { secureFile } from "@/main/utils/secureFile";
import { supportedFileConditions } from "@/main/utils/supportedFileTypes";

export async function generatePetaFile(param: {
  path: string;
  extends: Partial<PetaFile> & { id: string };
  dirOriginals: string;
  dirThumbnails: string;
  type: "update" | "add";
}): Promise<PetaFile> {
  const logger = useLogger().logMainChunk();
  logger.debug("#Generate PetaFile");
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
    encrypt: true,
  };
  const filePath = getPetaFilePath.fromPetaFile(petaFile);
  const encrypt = param.extends.encrypt !== petaFile.encrypt && petaFile.encrypt;
  if (fileInfo.original.transformedBuffer !== undefined) {
    if (encrypt) {
      await secureFile.encrypt.toFile(
        fileInfo.original.transformedBuffer,
        filePath.original,
        "1234",
      );
    } else {
      await writeFile(filePath.original, fileInfo.original.transformedBuffer);
    }
  } else {
    if (param.type === "add") {
      if (encrypt) {
        console.log("ENC1");
        await secureFile.encrypt.toFile(param.path, filePath.original, "1234");
      } else {
        await copyFile(param.path, filePath.original);
      }
    } else if (param.type === "update") {
      if (param.path !== filePath.original) {
        await rename(param.path, filePath.original);
      }
    }
  }
  if (encrypt) {
    await secureFile.encrypt.toFile(fileInfo.thumbnail.buffer, filePath.thumbnail, "1234");
  } else {
    await writeFile(filePath.thumbnail, fileInfo.thumbnail.buffer);
  }
  return petaFile;
}
export async function generateMetadata(path: string): Promise<GeneratedFileInfo | undefined> {
  const fileType = await fileTypeFromFile(path);
  const logger = useLogger().logMainChunk();
  logger.debug("#Generate Metadata", fileType?.mime);
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
