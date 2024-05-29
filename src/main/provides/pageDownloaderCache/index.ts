import { fileTypeFromBuffer } from "file-type";

import { createKey, createUseFunction } from "@/main/libs/di";
import { supportedFileConditions } from "@/main/utils/supportedFileTypes";

type Cache = {
  buffer: Buffer;
  url: string;
};
export class PageDownloaderCache {
  private cache: { [url: string]: Promise<Cache> } = {};
  clear() {
    this.cache = {};
  }
  async load(cacheURL: string) {
    if (this.cache[cacheURL] !== undefined) {
      return this.cache[cacheURL];
    }
    const { url, referer } = this.extractCacheURL(cacheURL);
    this.cache[cacheURL] = (async () => ({
      buffer: Buffer.from(
        await (
          await fetch(url, {
            headers: {
              Referer: referer,
              method: "GET",
            },
          })
        ).arrayBuffer(),
      ),
      url,
    }))();
    return this.cache[cacheURL];
  }
  async handle(request: Request) {
    const c = await this.load(request.url);
    const fileType = await fileTypeFromBuffer(c.buffer);
    if (fileType !== undefined && supportedFileConditions.image(fileType)) {
      return new Response(c.buffer, {
        headers: {
          "Content-Type": fileType.mime,
          "Cache-Control": "no-cache",
        },
      });
    }
    return new Response(undefined, { status: 404 });
  }
  extractCacheURL(cacheURL: string) {
    const params = new URL(cacheURL).searchParams;
    const url = params.get("url");
    const referer = params.get("referer");
    if (url && referer) {
      return {
        url,
        referer,
      };
    } else {
      throw "invalid cache url";
    }
  }
}

export const pageDownloaderCacheKey = createKey<PageDownloaderCache>("pageDownloaderCache");
export const usePageDownloaderCache = createUseFunction(pageDownloaderCacheKey);
