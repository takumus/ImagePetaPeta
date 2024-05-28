import { fileTypeFromBuffer } from "file-type";

import { createKey, createUseFunction } from "@/main/libs/di";

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
    const params = new URL(request.url).searchParams;
    const url = params.get("url");
    const referer = params.get("referer");
    console.log(url, referer);
    if (url && referer) {
      const buf = await this.add(url, referer);
      const headers = new Headers();
      headers.set("Content-Type", (await fileTypeFromBuffer(buf))?.mime ?? "");
      return new Response(buf, {
        headers,
      });
    }
    return new Response("", { status: 404 });
  }
}

export const pageDownloaderCacheKey = createKey<PageDownloaderCache>("pageDownloaderCache");
export const usePageDownloaderCache = createUseFunction(pageDownloaderCacheKey);
