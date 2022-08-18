import { DOMParser } from "@xmldom/xmldom";
export function getURLFromImgTag(html: string) {
  let src = "";
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, "text/html");
    const imgDom = dom.getElementsByTagName("img")[0];
    if (!imgDom) return "";
    const attrs = imgDom.attributes;
    let srcset = "";
    for (let i = 0; i < attrs.length; i++) {
      const key = attrs[i]!;
      const name = key.name.toLocaleLowerCase();
      if (name === "src") {
        src = key.value;
      } else if (name === "srcset") {
        srcset = key.value;
      }
    }
    let maxSize = 0;
    let maxSizeSrc = "";
    srcset
      .split(",")
      .map((src) => {
        return src.split(" ").filter((v) => {
          return v.trim() != "";
        });
      })
      .forEach((params) => {
        const url = params[0]!;
        const sizeStr = params[1];
        if (!sizeStr) return;
        const result = /([0-9]+\.?[0-9]*)/.exec(sizeStr);
        if (!result) return;
        const size = Number(result[0]);
        if (maxSize < size) {
          maxSize = size;
          maxSizeSrc = url;
        }
      });
    return maxSizeSrc != "" ? maxSizeSrc : src;
  } catch (e) {
    throw e;
  }
}
