export function getPetaFileInfoFromURL(url: string) {
  const filename = url.substring(url.lastIndexOf("/") + 1);
  const id = filename.split(".")[0];
  return {
    filename,
    id,
  };
}
