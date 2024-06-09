export function twitter(urls: string[]) {
  const url = urls.find((u) => u.startsWith("https://pbs.twimg.com/"));
  if (url === undefined) {
    return urls;
  }
  console.log("twitter driver");
  return [
    url.replace(/&name=[^&]*/, "&name=4096x4096"),
    url.replace(/&name=[^&]*/, "&name=large"),
    ...urls,
  ];
}
