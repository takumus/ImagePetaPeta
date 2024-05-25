import { Readable } from "node:stream";
import { fileTypeFromFile, fileTypeFromStream, FileTypeResult } from "file-type";

export async function isSupportedFile(source: string | Readable) {
  const fileType =
    typeof source === "string" ? await fileTypeFromFile(source) : await fileTypeFromStream(source);
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
export const supportedFileConditions = {
  image: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("image/");
  },
  video: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("video/");
  },
};
