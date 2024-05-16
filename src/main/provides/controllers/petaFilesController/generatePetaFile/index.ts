import { copyFile, readFile, rename, rm, writeFile } from "fs/promises";
import { fileTypeFromFile } from "file-type";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import { PetaFile } from "@/commons/datas/petaFile";

import { mkdirIfNotIxists } from "@/main/libs/file";
import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { generateImageMetadataByWorker } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata";
import { generateVideoMetadata } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateVideoMetadata";
import { useLogger } from "@/main/provides/utils/logger";
import { getPetaFileDirectoryPath, getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { secureFile } from "@/main/utils/secureFile";
import { supportedFileConditions } from "@/main/utils/supportedFileTypes";

export async function regeneratePetaFile(petaFile: PetaFile) {
  return await generatePetaFile({
    filePath: getPetaFilePath.fromPetaFile(petaFile).original,
    type: "update",
    extends: petaFile,
    encrypt: petaFile.encrypted,
  });
}
export async function generatePetaFile(param: {
  filePath: string;
  extends: Partial<PetaFile> & { id: string };
  type: "update" | "add";
  encrypt: boolean;
}): Promise<PetaFile> {
  const logger = useLogger().logMainChunk();
  const sfp = useConfigSecureFilePassword();
  logger.debug("#Generate PetaFile");
  const fileInfo = await generateMetadata(param.filePath);
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
    encrypted: param.encrypt,
  };
  const filePath = getPetaFilePath.fromPetaFile(petaFile);
  if (param.encrypt) {
    await secureFile.encrypt.toFile(fileInfo.thumbnail.buffer, filePath.thumbnail, sfp.getValue());
  } else {
    await writeFile(filePath.thumbnail, fileInfo.thumbnail.buffer);
  }
  switch (param.type) {
    case "add":
      if (fileInfo.original.transformedBuffer !== undefined) {
        if (param.encrypt) {
          await secureFile.encrypt.toFile(
            fileInfo.original.transformedBuffer,
            filePath.original,
            sfp.getValue(),
          );
        } else {
          await writeFile(filePath.original, fileInfo.original.transformedBuffer);
        }
      } else {
        if (param.encrypt) {
          await secureFile.encrypt.toFile(param.filePath, filePath.original, sfp.getValue());
        } else {
          await copyFile(param.filePath, filePath.original);
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
