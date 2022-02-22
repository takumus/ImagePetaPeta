export function getURLFromImgTag(html: string) {
  let src = "";
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, "text/html").querySelector("img");
    if (!dom) return "";
    const attrs = dom.attributes;
    let srcset = "";
    for (const key of attrs) {
      const name = key.name.toLocaleLowerCase();
      if (name == "src") {
        src = key.value;
      } else if (name == "srcset") {
        srcset = key.value;
      }
    }
    let maxSize = 0;
    let maxSizeSrc = "";
    srcset.split(",").map((src) => src.split(" ").filter((v) => v.trim()!= "")).forEach((params) => {
      const url = params[0];
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
    return src;
  }
}