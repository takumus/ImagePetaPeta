import { fileTypeFromBuffer } from "file-type";

import { createKey, createUseFunction } from "@/main/libs/di";
import { isSupportedFile, supportedFileConditions } from "@/main/utils/supportedFileTypes";

export class PageDownloaderCache {
  private cache: { [url: string]: Buffer } = {};
  private downloadings: { [url: string]: Promise<Buffer> } = {};
  clear() {
    this.cache = {};
  }
  async add(url: string, referer: string) {
    console.log(url);
    if (this.cache[url] !== undefined) {
      return this.cache[url];
    }
    if (this.downloadings[url] !== undefined) {
      return this.downloadings[url];
    }
    return (this.downloadings[url] = (async () => {
      return (this.cache[url] = Buffer.from(
        await (
          await fetch(url, {
            headers: {
              Referer: referer,
              method: "GET",
            },
          })
        ).arrayBuffer(),
      ));
    })());
  }
  get(url: string): Buffer | undefined {
    return this.cache[url];
  }
  async handle(request: Request) {
    const { url, referer } = this.extractCacheURL(request.url);
    if (url && referer) {
      const buffer = await this.add(url, referer);
      const fileType = await fileTypeFromBuffer(buffer);
      if (fileType !== undefined && supportedFileConditions.image(fileType)) {
        return new Response(buffer, {
          headers: {
            "Content-Type": fileType.mime,
          },
        });
      }
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
