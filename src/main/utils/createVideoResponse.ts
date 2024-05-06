import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable, Transform } from "stream";

import { PetaFile } from "@/commons/datas/petaFile";

import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { secureFile } from "@/main/utils/secureFile";

export async function createVideoResponse(request: Request, petaFile: PetaFile) {
  const sfp = useConfigSecureFilePassword();
  const path = getPetaFilePath.fromPetaFile(petaFile).original;
  const fileSize = (await stat(path)).size;
  const headers = new Headers();
  const rangeText = request.headers.get("range");
  let stream: Readable;
  let status = 200;
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Type", petaFile?.metadata.mimeType ?? "video/mp4");
  if (rangeText) {
    const [start, end] = parseRangeRequests(rangeText, fileSize)[0];
    const contentLength = end - start;
    headers.set("Content-Length", `${contentLength + 1}`);
    headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    status = 206;
    if (petaFile?.encrypted) {
      const [startAESBlock, endAESBlock] = [Math.floor(start / 16), Math.ceil(end / 16) + 1];
      const [startAESByte, endAESByte] = [startAESBlock * 16, endAESBlock * 16];
      const startByteOffset = start - startAESByte;
      stream = secureFile.decrypt
        .toStream(path, sfp.getValue(), { startBlock: startAESBlock, endBlock: endAESBlock })
        .pipe(createCroppedStream(startByteOffset, contentLength + startByteOffset));
    } else {
      stream = createReadStream(path, { start, end });
    }
  } else {
    headers.set("Content-Length", `${fileSize}`);
    stream = secureFile.decrypt.toStream(path, sfp.getValue());
  }
  return new Response(stream as any, {
    headers,
    status,
  });
}
function parseRangeRequests(text: string, size: number) {
  const token = text.split("=");
  if (token.length !== 2 || token[0] !== "bytes") {
    return [];
  }
  return token[1]
    .split(",")
    .map((v) => parseRange(v, size))
    .filter(([start, end]) => !isNaN(start) && !isNaN(end) && start <= end);
}
function parseRange(text: string, size: number) {
  const token = text.split("-");
  if (token.length !== 2) {
    return [NaN, NaN];
  }
  const startText = token[0].trim();
  const endText = token[1].trim();
  if (startText === "") {
    if (endText === "") {
      return [NaN, NaN];
    } else {
      let start = size - Number(endText);
      if (start < 0) {
        start = 0;
      }
      return [start, size - 1];
    }
  } else {
    if (endText === "") {
      return [Number(startText), size - 1];
    } else {
      let end = Number(endText);
      if (end >= size) {
        end = size - 1;
      }
      return [Number(startText), end];
    }
  }
}
function createCroppedStream(start: number, end: number) {
  let currentIndex = 0;
  const _end = end + 1;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (currentIndex < _end) {
        const startOffset = Math.max(start - currentIndex, 0);
        const endOffset = Math.min(chunk.length, _end - currentIndex);
        const relevantData = chunk.slice(startOffset, endOffset);
        currentIndex += chunk.length;
        this.push(relevantData);
      }
      callback();
    },
  });
}
