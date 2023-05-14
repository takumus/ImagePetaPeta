import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaFilePetaTag } from "@/commons/datas/petaFilesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";

import DB from "@/main/libs/db";
import { createKey, createUseFunction } from "@/main/libs/di";

export const dbPetaFilesKey = createKey<DB<PetaFile>>("dbPetaFiles");
export const dbPetaTagsKey = createKey<DB<PetaTag>>("dbPetaTags");
export const dbPetaBoardsKey = createKey<DB<PetaBoard>>("dbPetaBoards");
export const dbPetaTagPartitionsKey = createKey<DB<PetaTagPartition>>("dbPetaTagPartitions");
export const dbPetaFilesPetaTagsKey = createKey<DB<PetaFilePetaTag>>("dbPetaFilesPetaTags");
export const dbStatusKey = createKey<{ initialized: boolean }>("dbStatus");
export const dbsKey = createKey<{
  dbs: DB<any>[];
  waitUntilKillable: () => Promise<void>;
}>("dbs");

export const useDBPetaFiles = createUseFunction(dbPetaFilesKey);
export const useDBPetaTags = createUseFunction(dbPetaTagsKey);
export const useDBPetaBoards = createUseFunction(dbPetaBoardsKey);
export const useDBPetaTagPartitions = createUseFunction(dbPetaTagPartitionsKey);
export const useDBPetaFilesPetaTags = createUseFunction(dbPetaFilesPetaTagsKey);
export const useDBStatus = createUseFunction(dbStatusKey);
export const useDBS = createUseFunction(dbsKey);
