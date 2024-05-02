import { createReadStream, ReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable, Transform } from "stream";

import { getPetaFileInfoFromURL } from "@/commons/utils/getPetaFileInfoFromURL";

import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { secureFile } from "@/main/utils/secureFile";

export async function tempHandleVideo(request: Request) {
  const info = getPetaFileInfoFromURL(request.url);
  console.log("\nstream", info.filename);
  const pf = await usePetaFilesController().getPetaFile(info.id);
  const path = getPetaFilePath.fromIDAndFilename(info.id, info.filename, "original");
  const size = (await stat(path)).size;
  const headers = new Headers();
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Type", pf?.mimeType ?? "video/mp4");
  let status = 200;
  const rangeText = request.headers.get("range");

  let stream: Readable;
  if (rangeText) {
    const [start, end] = parseRangeRequests(rangeText, size)[0];
    const [startBlock, endBlock] = [Math.floor(start / 16), Math.ceil(end / 16)];
    const [_start, _end] = [startBlock * 16, endBlock * 16];
    console.log(`リクエスト(${path.slice(-10)}): ${start}byte - ${end}byte (${size})`);
    console.log("サイズ:", size);
    headers.set("Content-Length", `${end - start + 1}`);
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    status = 206;
    stream = secureFile.decrypt
      .toStream(path, "1234", { startBlock })
      .pipe(createCroppedStream(start - _start, end - start + start - _start));
    // stream = secureFile.decrypt.toStream(path, "1234").pipe(createCroppedStream(start, end));
  } else {
    headers.set("Content-Length", `${size}`);
    // stream = createReadStream(path);
    stream = secureFile.decrypt.toStream(path, "1234");
  }
  stream.on("data", (d) => console.log(`復号(${path.slice(-10)}): ${d.length}bytes`));
  stream.on("close", () => console.log(`終了cls(${path.slice(-10)})`));
  stream.on("end", () => console.log(`終了end(${path.slice(-10)})`));
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
