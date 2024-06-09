import { createReadStream } from "node:fs";
import { copyFile, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileTypeFromFile, fileTypeFromStream } from "file-type";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { FileType } from "@/commons/datas/fileType";
import { PetaFile } from "@/commons/datas/petaFile";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { generateImageFileInfoByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo";
import { generateVideoFileInfo } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoFileInfo";
import { useSecureTempFileKey } from "@/main/provides/tempFileKey";
import { useLogger } from "@/main/provides/utils/logger";
import { getPetaFileDirectoryPath, getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { getStreamFromPetaFile, secureFile } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";
import { supportedFileConditions } from "@/main/utils/supportedFileTypes";
import { getFileURL } from "@/renderer/utils/fileURL";

export async function regeneratePetaFile(petaFile: PetaFile) {
  return await generatePetaFile({
    filePath: getPetaFilePath.fromPetaFile(petaFile).original,
    type: "update",
    extends: petaFile,
    doEncrypt: petaFile.encrypted,
  });
}
export async function generatePetaFile(param: {
  filePath: string;
  extends: Partial<PetaFile> & { id: string };
  type: "update" | "add";
  doEncrypt: boolean;
  secureTempFile?: boolean;
}): Promise<PetaFile> {
  const logger = useLogger().logMainChunk();
  const sfp = useConfigSecureFilePassword();
  logger.debug("#Generate PetaFile");
  const fileInfo = await generateFileInfo(
    param.type === "update" ? (param.extends as PetaFile) : param.filePath,
    param.secureTempFile,
  );
  if (fileInfo === undefined) {
    throw new Error("unsupported file");
  }
  const directory = getPetaFileDirectoryPath.fromID(param.extends.id);
  const originalFileName = `${param.extends.id}.${fileInfo.original.extention}`; // xxxxxxxx.png
  const thumbnailFileName = `${param.extends.id}.${fileInfo.original.extention}.${fileInfo.thumbnail.extention}`; // xxxxxxxx.png.webp
  await mkdirIfNotIxists(directory.original, { recursive: true });
  await mkdirIfNotIxists(directory.thumbnail, { recursive: true });
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
    // mimeType: fileInfo.original.mimeType,
    nsfw: param.extends.nsfw ?? false,
    metadata: fileInfo.metadata,
    encrypted: param.doEncrypt,
  };
  const filePath = getPetaFilePath.fromPetaFile(petaFile);
  if (param.doEncrypt) {
    await secureFile.encrypt.toFile(fileInfo.thumbnail.buffer, filePath.thumbnail, sfp.getKey());
  } else {
    await writeFile(filePath.thumbnail, fileInfo.thumbnail.buffer);
  }
  switch (param.type) {
    case "add":
      if (fileInfo.original.transformedBuffer !== undefined) {
        if (param.doEncrypt) {
          await secureFile.encrypt.toFile(
            fileInfo.original.transformedBuffer,
            filePath.original,
            sfp.getKey(),
          );
        } else {
          await writeFile(filePath.original, fileInfo.original.transformedBuffer);
        }
      } else {
        if (param.doEncrypt) {
          const from = param.secureTempFile
            ? secureFile.decrypt.toStream(param.filePath, useSecureTempFileKey())
            : param.filePath;
          await secureFile.encrypt.toFile(from, filePath.original, sfp.getKey());
        } else {
          if (param.secureTempFile) {
            await secureFile.decrypt.toFile(
              param.filePath,
              filePath.original,
              useSecureTempFileKey(),
            );
          } else {
            await copyFile(param.filePath, filePath.original);
          }
        }
      }
      return petaFile;
    case "update":
      if (param.filePath !== filePath.original) {
        await rename(param.filePath, filePath.original);
      }
      return petaFile;
  }
}
export async function generateFileInfo(
  source: string | PetaFile,
  secureTempFile?: boolean,
): Promise<GeneratedFileInfo | undefined> {
  if (typeof source === "string") {
    const filePath = source;
    function getStream() {
      return secureFile.decrypt.toStream(filePath, useSecureTempFileKey());
    }
    const fileType = await fileTypeFromStream(
      secureTempFile ? getStream() : createReadStream(filePath),
    );
    const logger = useLogger().logMainChunk();
    logger.debug("#Generate FileInfo", fileType?.mime, `encrypted: ${secureTempFile}`);
    if (fileType !== undefined) {
      if (supportedFileConditions.image(fileType)) {
        return generateImageFileInfoByWorker({
          buffer: secureTempFile ? await streamToBuffer(getStream()) : await readFile(filePath),
          fileType: fileType,
        });
      }
      if (supportedFileConditions.video(fileType)) {
        return generateVideoFileInfo({ path: filePath }, fileType);
      }
    }
  } else {
    const petaFile = source;
    function getStream() {
      return getStreamFromPetaFile(petaFile, "original");
    }
    const fileType = await fileTypeFromStream(getStream());
    const logger = useLogger().logMainChunk();
    logger.debug("#Generate FileInfo", fileType?.mime);
    if (fileType !== undefined) {
      if (supportedFileConditions.image(fileType)) {
        return generateImageFileInfoByWorker({
          buffer: await streamToBuffer(getStream()),
          fileType: fileType,
        });
      }
      if (supportedFileConditions.video(fileType)) {
        return generateVideoFileInfo({ url: getFileURL(petaFile, "original") }, fileType);
      }
    }
  }
  return undefined;
}
