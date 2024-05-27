import { fileTypeFromBuffer } from "file-type";

import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { ppa } from "@/commons/utils/pp";

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
    const downloading =
      this.downloadings[url] ??
      (async () => {
        const init: RequestInit = {
          headers: {
            Referer: referer,
            method: "GET",
          },
        };
        return Buffer.from(await (await fetch(url, init)).arrayBuffer());
      })();
    this.downloadings[url] = downloading;
    const buffer = await downloading;
    if (this.cache[url] === undefined) {
      this.cache[url] = buffer;
    }
    return buffer;
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
