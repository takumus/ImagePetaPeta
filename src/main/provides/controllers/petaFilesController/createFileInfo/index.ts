import { dataUriToBuffer } from "data-uri-to-buffer";
import { writeFile } from "fs/promises";
import Path from "path";
import { v4 as uuid } from "uuid";

import { ImportFileInfo } from "@/commons/datas/importFileInfo";

import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { isSupportedFile } from "@/main/utils/supportedFileTypes";

export const createFileInfo = {
  fromURL: async (
    url: string,
    referrer?: string,
    ua?: string,
  ): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.debug("## Create File Info URL");
      let data: Buffer;
      let remoteURL = "";
      if (url.trim().startsWith("data:")) {
        // dataURIだったら
        data = dataUriToBuffer(url);
      } else {
        // 普通のurlだったら
        const init: RequestInit = {
          headers: {
            ...(ua !== undefined
              ? {
                  "user-agent": ua,
                }
              : {}),
            ...(referrer !== undefined
              ? {
                  Referer: referrer,
                }
              : {}),
            method: "GET",
          },
        };
        log.debug("RequestInit:", init);
        data = Buffer.from(await (await fetch(url, init)).arrayBuffer());
        remoteURL = url;
      }
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await writeFile(dist, data);
      if (!(await isSupportedFile(dist))) {
        throw new Error("unsupported file");
      }
      log.debug("return:", true);
      return {
        path: dist,
        note: remoteURL,
        name: "downloaded",
      };
    } catch (error) {
      log.error(error);
    }
    log.debug("return:", false);
    return undefined;
  },
  fromBuffer: async (buffer: ArrayBuffer | Buffer): Promise<ImportFileInfo | undefined> => {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    try {
      log.debug("## Create File Info From ArrayBuffer");
      const dist = Path.resolve(paths.DIR_TEMP, uuid());
      await writeFile(dist, buffer instanceof Buffer ? buffer : Buffer.from(buffer));
      if (!(await isSupportedFile(dist))) {
        throw new Error("unsupported file");
      }
      log.debug("return:", true);
      return {
        path: dist,
        note: "",
        name: "noname",
      };
    } catch (error) {
      log.error(error);
    }
    log.debug("return:", false);
    return undefined;
  },
} as const;
