import { FileTypeResult, fileTypeFromFile } from "file-type";

import * as file from "@/main/libs/file";
import { addImage } from "@/main/provides/controllers/petaFilesController/addFile/addImage";
import { useLogger } from "@/main/provides/utils/logger";

export type AddFileInfo = {
  thumbnailsBuffer: Buffer;
  ext: string;
  width: number;
  height: number;
};
export async function addFile(path: string): Promise<AddFileInfo | undefined> {
  const logger = useLogger().logMainChunk();
  const filetype = await fileTypeFromFile(path);
  logger.log("file type:", filetype?.mime);
  if (filetype !== undefined) {
    if (supportedFileConditions.image(filetype)) {
      return addImage(await file.readFile(path), filetype.ext);
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
};
