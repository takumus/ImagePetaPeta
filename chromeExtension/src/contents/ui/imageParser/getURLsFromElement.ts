export function getURLsFromElement(element: HTMLElement) {
  const urls = [
    ...(() => {
      switch (element.tagName) {
        // case "a":
        //   return fromA(element);
        case "IMG":
          return fromImg(element);
      }
      return [];
    })(),
    ...getURLFromStyle(window.getComputedStyle(element)),
  ];
  const modifiedURLs = Array.from(new Set(urls)).map((url) => new URL(url, location.href).href);
  return modifiedURLs;
}
function getURLFromStyle(style: CSSStyleDeclaration) {
  const regexp = /url\(['"]?\s*([\s\S]*?)['"]?\s*\)/g;
  return Array.from(
    new Set([
      ...[...style.backgroundImage.matchAll(regexp)].map((v) => v[1]),
      ...[...style.background.matchAll(regexp)].map((v) => v[1]),
    ]),
  );
}
function fromA(dom: HTMLElement) {
  const href = dom.getAttribute("href");
  return href ? [href] : [];
}
function fromImg(dom: HTMLElement) {
  const max = dom
    .getAttribute("srcset")
    ?.split(",")
    .map((src) => {
      return src
        .trim()
        .split(/\s+/g)
        .map((v) => v.trim());
    })
    .reduce(
      (prev, current) => {
        const src = current[0];
        const sizeStr = /([0-9]+\.?[0-9]*)/.exec(current[1] ?? "0")?.[0];
        if (!sizeStr) return prev;
        const size = Number(sizeStr);
        if (isNaN(size)) return prev;
        if (prev.size < size) {
          return {
            size: size,
            src: src,
          };
        }
        return prev;
      },
      { size: 0, src: undefined as string | undefined },
    );
  const src = dom.getAttribute("src");
  if (src === undefined && max?.src === undefined) {
    return [];
  }
  return [...(max?.src ? [max.src] : []), ...(src ? [src] : [])];
}
