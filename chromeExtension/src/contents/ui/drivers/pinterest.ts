export function pinterest(urls: string[]) {
  const url = urls.find((u) => u.startsWith("https://i.pinimg.com"));
  if (url === undefined) {
    return urls;
  }
  console.log("pinterest driver");
  return [url.replace(/i\.pinimg\.com\/.*\dx\//, "i.pinimg.com/originals/"), ...urls];
}
