import { LogChunk } from "@/commons/datas/logChunk";
import { createLogChunkFunction } from "@/commons/utils/logChunk";

import { IPC } from "@/renderer/libs/ipc";

export function logChunk(label: string): LogChunk {
  return _logChunk("REND", label);
}

const _logChunk = createLogChunkFunction((_from, id, ...args) => IPC.common.log(id, ...args));
