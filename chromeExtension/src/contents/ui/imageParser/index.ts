import { transFormURLs } from "$/contents/ui/drivers";
import { getURLsFromElement } from "$/contents/ui/imageParser/getURLsFromElement";

export interface ImageParserResult {
  element: HTMLElement;
  rect: DOMRect;
  urls: string[];
  depth: number;
}

export function getData(
  hitArea?: { x: number; y: number } | { x: number; y: number; width: number; height: number },
) {
  const elements = Array.from(document.querySelectorAll("*")) as HTMLElement[];
  function getDepth(element: HTMLElement) {
    let parent: HTMLElement | null = element.parentElement;
    let depth = 0;
    while (parent !== null) {
      parent = parent?.parentElement;
      depth++;
    }
    return depth;
  }
  const results: ImageParserResult[] = elements
    .map((element) => ({
      element,
      rect: element.getBoundingClientRect(),
      urls: transFormURLs(getURLsFromElement(element)),
      depth: getDepth(element),
    }))
    .filter((res) => {
      const rect = res.rect;
      const isInRect =
        hitArea !== undefined
          ? "width" in hitArea
            ? Math.abs(rect.x + rect.width / 2 - (hitArea.x + hitArea.width / 2)) <
                rect.width / 2 + hitArea.width / 2 &&
              Math.abs(rect.y + rect.height / 2 - (hitArea.y + hitArea.height / 2)) <
                rect.height / 2 + hitArea.height / 2
            : Math.abs(rect.x + rect.width / 2 - hitArea.x) < rect.width / 2 &&
              Math.abs(rect.y + rect.height / 2 - hitArea.y) < rect.height / 2
          : true;
      const hasURL = res.urls.length > 0;
      return isInRect && hasURL;
    })
    .sort((a, b) => b.depth - a.depth);
  return results;
}
