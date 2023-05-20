import { DOMParser as XMLDOMParser } from "@xmldom/xmldom";

export function getURLFromHTML(html: string) {
  try {
    const dom = new XMLDOMParser().parseFromString(`<wrapper>${html}</wrapper>`, "text/html");
    const imgDom = dom.getElementsByTagName("img")[0];
    const aDom = dom.getElementsByTagName("a")[0];
    const videoDom = dom.getElementsByTagName("video")[0];
    if (imgDom !== undefined) {
      const urls = fromImg(imgDom);
      if (urls !== undefined) {
        return urls;
      }
    } else if (aDom !== undefined) {
      const url = fromA(aDom);
      if (url !== undefined) {
        return [url];
      }
    } else if (videoDom !== undefined) {
      const url = fromVideo(videoDom);
      if (url !== undefined) {
        return [url];
      }
    }
  } catch {
    //
  }
  return undefined;
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
  if (src === undefined && max?.src === undefined) {
    return undefined;
  }
  return [...(max?.src ? [max.src] : []), ...(src ? [src] : [])];
}
function fromVideo(dom: HTMLVideoElement) {
  const attrs = Array.from(dom.attributes);
  const src = getValueFromAttrs("src", attrs);
  return src;
}

function getValueFromAttrs(name: string, attrs: Attr[]) {
  return attrs.find((attr) => attr.name.toLowerCase() === name)?.value.trim();
}
