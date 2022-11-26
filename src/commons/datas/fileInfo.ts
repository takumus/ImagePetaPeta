import { PetaFileMetadata } from "@/commons/datas/petaFile";

export type GeneratedFileInfo = {
  extention: string;
  thumbnail: {
    buffer: Buffer;
    extention: string;
  };
  metadata: PetaFileMetadata;
};
