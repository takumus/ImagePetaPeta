import { MimeType } from "file-type";

import { PetaFileMetadata } from "@/commons/datas/petaFile";

export type GeneratedFileInfo = {
  original: {
    extention: string;
    mimeType: MimeType;
  };
  thumbnail: {
    buffer: Buffer;
    extention: string;
  };
  metadata: PetaFileMetadata;
};
