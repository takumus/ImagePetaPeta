import { DOMParser } from "@xmldom/xmldom";
export function getURLFromHTML(html: string) {
  console.log(html);
  const dom = new DOMParser().parseFromString(html, "text/html");
  const imgDom = dom.getElementsByTagName("img")[0];
  const aDom = dom.getElementsByTagName("a")[0];
  if (imgDom !== undefined) {
    const url = fromImg(imgDom);
    if (url !== undefined) {
      return url;
    }
  } else if (aDom !== undefined) {
    const url = fromA(aDom);
    if (url !== undefined) {
      return url;
    }
  }
  throw new Error("invalid html");
}
function fromA(dom: HTMLAnchorElement) {
  const attrs = Array.from(dom.attributes);
  const href = getValueFromAttrs("href", attrs);
  return href;
}
function fromImg(dom: HTMLImageElement) {
  const attrs = Array.from(dom.attributes);
  const max = getValueFromAttrs("srcset", attrs)
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
  const src = getValueFromAttrs("src", attrs);
  return max?.src ?? src;
}

function getValueFromAttrs(name: string, attrs: Attr[]) {
  return attrs.find((attr) => attr.name.toLowerCase() === name)?.value.trim();
}
