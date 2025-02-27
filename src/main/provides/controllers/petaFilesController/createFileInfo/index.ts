import { writeFile } from "node:fs/promises";
import Path from "node:path";
import { dataUriToBuffer } from "data-uri-to-buffer";
import { v4 as uuid } from "uuid";

import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { PROTOCOLS } from "@/commons/defines";

import { usePageDownloaderCache } from "@/main/provides/pageDownloaderCache";
import { useSecureTempFileKey } from "@/main/provides/tempFileKey";
import { useLogger } from "@/main/provides/utils/logger";
import { useAppPaths, useLibraryPaths } from "@/main/provides/utils/paths";
import { secureFile } from "@/main/utils/secureFile";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export const createFileInfo = {
  fromURL: async (
    url: string,
    referrer?: string,
    ua?: string,
    encryptTempFile = true,
  ): Promise<ImportFileInfo | undefined> => {
    const appPaths = useAppPaths();
    const log = useLogger().logChunk("createFileInfo.fromURL");
    try {
      let buffer: Buffer | undefined;
      let remoteURL = "";
      if (url.startsWith(PROTOCOLS.FILE.PAGE_DOWNLOADER_CACHE)) {
        // cache URLだったら
        log.debug("### Cache URL");
        const pdc = usePageDownloaderCache();
        const cache = await pdc.load(url);
        remoteURL = cache.url;
        buffer = cache.buffer;
      } else if (url.trim().startsWith("data:")) {
        // dataURIだったら
        log.debug("### Data URI");
        buffer = Buffer.from(dataUriToBuffer(url).buffer);
      } else {
        // 普通のurlだったら
        log.debug("### Normal URL");
        const init: RequestInit = {
          headers: {
            // ...(ua !== undefined
            //   ? {
            //       "user-agent": ua,
            //     }
            //   : {}),
            ...(referrer !== undefined
              ? {
                  Referer: referrer,
                }
              : {}),
            method: "GET",
          },
        };
        log.debug("RequestInit:", init);
        buffer = Buffer.from(await (await fetch(url, init)).arrayBuffer());
        remoteURL = url;
      }
      if (buffer === undefined) {
        throw `buffer is undefined`;
      }
      const dist = Path.resolve(appPaths.DIR_TEMP, uuid());
      await exportTempFileAndCheck(buffer, dist, encryptTempFile);
      log.debug("return:", true);
      return {
        path: dist,
        note: remoteURL,
        name: "downloaded",
        secureTempFile: encryptTempFile,
      };
    } catch (error) {
      log.error(error);
    }
    log.debug("return:", false);
    return undefined;
  },
  fromBuffer: async (
    bufferLike: ArrayBufferLike | Buffer,
    encryptTempFile = true,
  ): Promise<ImportFileInfo | undefined> => {
    const appPaths = useAppPaths();
    const log = useLogger().logChunk("createFileInfo.fromBuffer");
    try {
      const dist = Path.resolve(appPaths.DIR_TEMP, uuid());
      const buffer =
        bufferLike instanceof Buffer ? bufferLike : Buffer.from(bufferLike as ArrayBufferLike);
      await exportTempFileAndCheck(buffer, dist, encryptTempFile);
      log.debug("return:", true);
      return {
        path: dist,
        note: "",
        name: "noname",
        secureTempFile: true,
      };
    } catch (error) {
      log.error(error);
    }
    log.debug("return:", false);
    return undefined;
  },
} as const;
async function exportTempFileAndCheck(buffer: Buffer, dist: string, encryptTempFile: boolean) {
  if (encryptTempFile) {
    await secureFile.encrypt.toFile(buffer, dist, useSecureTempFileKey());
    if (!(await isSupportedFile(secureFile.decrypt.toStream(dist, useSecureTempFileKey())))) {
      throw new Error("unsupported file");
    }
  } else {
    await writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
    if (!(await isSupportedFile(dist))) {
      throw new Error("unsupported file");
    }
  }
}
