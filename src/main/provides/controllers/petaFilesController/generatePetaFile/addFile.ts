import { FileTypeResult, fileTypeFromFile } from "file-type";

import { PetaFileMetadata } from "@/commons/datas/petaFile";

import * as file from "@/main/libs/file";
import { addImage } from "@/main/provides/controllers/petaFilesController/generatePetaFile/addImage";

export type AddFileInfo = {
  extention: string;
  thumbnail: {
    buffer: Buffer;
    extention: string;
  };
  metadata: PetaFileMetadata;
};
export async function addFile(path: string): Promise<AddFileInfo | undefined> {
  const filetype = await fileTypeFromFile(path);
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
  video: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("video/");
  },
};
