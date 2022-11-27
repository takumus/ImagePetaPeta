import { FileTypeResult, fileTypeFromFile } from "file-type";

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
export const supportedFileConditions = {
  image: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("image/");
  },
  video: (fileType: FileTypeResult) => {
    return fileType.mime.startsWith("video/");
  },
};
