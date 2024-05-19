export function mobilenetURLToFilename(url: string) {
  return url.split("?")[0].replace(/[:/]/g, "-");
}
