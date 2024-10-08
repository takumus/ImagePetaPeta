import { stat } from "node:fs/promises";
import { Readable, Transform } from "node:stream";

import { PetaFile } from "@/commons/datas/petaFile";

import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { createPetaFileReadStream } from "@/main/utils/secureFile";

export async function createVideoResponse(request: Request, petaFile: PetaFile) {
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
    stream = createPetaFileReadStream(petaFile, "original", { start, end });
  } else {
    headers.set("Content-Length", `${fileSize}`);
    stream = createPetaFileReadStream(petaFile, "original");
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
