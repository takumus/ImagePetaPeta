export function getLastSegmentFromURL(url: string) {
  return url.substring(url.lastIndexOf("/") + 1);
}
