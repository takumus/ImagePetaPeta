const imageExtensions = "(png|jpe?g|gif|bmp|webp|svg)";
const urlPattern = new RegExp(`\\.${imageExtensions}(\\?.*)?$`, "i");
const dataPattern = new RegExp(`^data:image\\/${imageExtensions};base64,`, "i");
export function getImageExtension(url: string): string | undefined {
  const urlPath = new URL(url).pathname;
  const urlMatch = urlPath.match(urlPattern);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }
  const dataMatch = url.match(dataPattern);
  if (dataMatch) {
    return dataMatch[1].toLowerCase();
  }
  return undefined;
}
