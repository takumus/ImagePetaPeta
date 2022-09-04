let ordered: { callback: (failed: boolean) => void; image: HTMLImageElement; src: string }[] = [];
export function decode(image: HTMLImageElement, src: string, callback: (failed: boolean) => void) {
  ordered.push({
    image,
    callback,
    src,
  });
  if (ordered.length === 1) {
    doDecode();
  }
}
export function clear() {
  ordered = [];
}
async function doDecode() {
  const first = ordered[0];
  if (first === undefined) {
    return;
  }
  try {
    first.image.src = first.src;
    await first.image.decode();
    first.callback(false);
  } catch {
    first.callback(true);
  }
  ordered = ordered.filter((image) => first !== image);
  doDecode();
}
