import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import Path from "path";
import { dataUriToBuffer } from "data-uri-to-buffer";
import { v4 as uuid } from "uuid";

import { ImportFileInfo } from "@/commons/datas/importFileInfo";

import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { secureFile } from "@/main/utils/secureFile";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export const createFileInfo = {
  fromURL: async (
    url: string,
    referrer?: string,
    ua?: string,
    encryptTempFile = true,
  ): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.debug("## Create File Info URL");
      let buffer: Buffer;
      let remoteURL = "";
      if (url.trim().startsWith("data:")) {
        // dataURIだったら
        buffer = Buffer.from(dataUriToBuffer(url).buffer);
      } else {
        // 普通のurlだったら
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
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await exportTempFileAndCheck(buffer, dist, encryptTempFile);
      log.debug("return:", true);
      return {
        path: dist,
        note: remoteURL,
        name: "downloaded",
        encrypted: encryptTempFile,
      };
    } catch (error) {
      log.error(error);
    }
    log.debug("return:", false);
    return undefined;
  },
  fromBuffer: async (
    bufferLike: ArrayBuffer | Buffer,
    encryptTempFile = true,
  ): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.debug("## Create File Info From ArrayBuffer");
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      const buffer = bufferLike instanceof Buffer ? bufferLike : Buffer.from(bufferLike);
      await exportTempFileAndCheck(buffer, dist, encryptTempFile);
      log.debug("return:", true);
      return {
        path: dist,
        note: "",
        name: "noname",
        encrypted: true,
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
    await secureFile.encrypt.toFile(buffer, dist, useConfigSecureFilePassword().getTempFileKey());
    if (
      !(await isSupportedFile(
        secureFile.decrypt.toStream(dist, useConfigSecureFilePassword().getTempFileKey()),
      ))
    ) {
      throw new Error("unsupported file");
    }
  } else {
    await writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
    if (!(await isSupportedFile(dist))) {
      throw new Error("unsupported file");
    }
  }
}
