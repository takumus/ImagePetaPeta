import { createReadStream } from "node:fs";
import { copyFile, readFile, rename, writeFile } from "node:fs/promises";
import { fileTypeFromStream } from "file-type";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { generateImageFileInfoByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo";
import { generateVideoFileInfo } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoFileInfo";
import { useSecureTempFileKey } from "@/main/provides/tempFileKey";
import { useLogger } from "@/main/provides/utils/logger";
import { getPetaFileDirectoryPath, getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { createPetaFileReadStream, secureFile, writeSecurePetaFile } from "@/main/utils/secureFile";
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
  const logger = useLogger().logChunk("generatePetaFile");
  const sfp = useConfigSecureFilePassword();
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
    await writeSecurePetaFile(petaFile, fileInfo.thumbnail.buffer, filePath.thumbnail);
  } else {
    await writeFile(filePath.thumbnail, fileInfo.thumbnail.buffer);
  }
  switch (param.type) {
    case "add":
      if (fileInfo.original.transformedBuffer !== undefined) {
        if (param.doEncrypt) {
          await writeSecurePetaFile(
            petaFile,
            fileInfo.original.transformedBuffer,
            filePath.original,
          );
        } else {
          await writeFile(filePath.original, fileInfo.original.transformedBuffer);
        }
      } else {
        if (param.doEncrypt) {
          const from = param.secureTempFile
            ? secureFile.decrypt.toStream(param.filePath, useSecureTempFileKey())
            : param.filePath;
          await writeSecurePetaFile(petaFile, from, filePath.original);
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
  const logger = useLogger().logChunk("generateFileInfo");
  if (typeof source === "string") {
    const filePath = source;
    function getStream() {
      return secureFile.decrypt.toStream(filePath, useSecureTempFileKey());
    }
    const fileType = await fileTypeFromStream(
      secureTempFile ? getStream() : createReadStream(filePath),
    );
    logger.debug(fileType?.mime, `encrypted: ${secureTempFile}`);
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
      return createPetaFileReadStream(petaFile, "original");
    }
    const fileType = await fileTypeFromStream(getStream());
    logger.debug(fileType?.mime);
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
