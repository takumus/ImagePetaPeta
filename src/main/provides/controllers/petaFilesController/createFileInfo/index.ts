import dataUriToBuffer from "data-uri-to-buffer";
import { writeFile } from "fs/promises";
import Path from "path";
import { v4 as uuid } from "uuid";

import { ImportFileInfo } from "@/commons/datas/importFileInfo";

import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export const createFileInfo = {
  fromURL: async (url: string, referrer?: string): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.log("## Create File Info URL");
      let data: Buffer;
      let remoteURL = "";
      if (url.trim().startsWith("data:")) {
        // dataURIだったら
        data = dataUriToBuffer(url);
      } else {
        // 普通のurlだったら
        data = Buffer.from(
          await (
            await fetch(url, {
              headers:
                referrer !== undefined
                  ? {
                      Referer: referrer,
                    }
                  : undefined,
              method: "GET",
            })
          ).arrayBuffer(),
        );
        remoteURL = url;
      }
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await writeFile(dist, data);
      if (!(await isSupportedFile(dist))) {
        throw new Error("unsupported file");
      }
      log.log("return:", true);
      return {
        path: dist,
        note: remoteURL,
        name: "downloaded",
      };
    } catch (error) {
      log.error(error);
    }
    log.log("return:", false);
    return undefined;
  },
  fromBuffer: async (buffer: ArrayBuffer | Buffer): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.log("## Create File Info From ArrayBuffer");
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
      if (!(await isSupportedFile(dist))) {
        throw new Error("unsupported file");
      }
      log.log("return:", true);
      return {
        path: dist,
        note: "",
        name: "noname",
      };
    } catch (error) {
      log.error(error);
    }
    log.log("return:", false);
    return undefined;
  },
} as const;
