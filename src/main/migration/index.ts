import { minimizeID } from "@/commons/utils/minimizeID";
import { ppa } from "@/commons/utils/pp";

import { migratePetaBoard } from "@/main/migration/migratePetaBoard";
import { migratePetaFile } from "@/main/migration/migratePetaFile";
import { migratePetaFilesPetaTags } from "@/main/migration/migratePetaFilesPetaTags";
import { migratePetaTag } from "@/main/migration/migratePetaTag";
import {
  useDBPetaBoards,
  useDBPetaFiles,
  useDBPetaFilesPetaTags,
  useDBPetaTags,
} from "@/main/provides/databases";

export async function migrate(onProgress: (log: string) => void) {
  const dbPetaBoard = useDBPetaBoards();
  const dbPetaFiles = useDBPetaFiles();
  const dbPetaTags = useDBPetaTags();
  const dbPetaFilesPetaTags = useDBPetaFilesPetaTags();
  await ppa(async (pi) => {
    const result = migratePetaFile(pi);
    if (result.updated) {
      onProgress(`PetaFile(${minimizeID(result.data.id)})`);
      await dbPetaFiles.update({ id: result.data.id }, result.data);
    }
  }, dbPetaFiles.getAll()).promise;
  await ppa(async (pt) => {
    const result = migratePetaTag(pt);
    if (result.updated) {
      onProgress(`PetaTag(${minimizeID(result.data.id)})`);
      await dbPetaTags.update({ id: result.data.id }, result.data);
    }
  }, dbPetaTags.getAll()).promise;
  await ppa(async (pfpt) => {
    const result = migratePetaFilesPetaTags(pfpt);
    if (result.updated) {
      onProgress(`PetaFilesPetaTags(${minimizeID(result.data.id)})`);
      await dbPetaFilesPetaTags.update({ id: result.data.id }, result.data);
    }
  }, dbPetaFilesPetaTags.getAll()).promise;
  await ppa(async (pb) => {
    const result = migratePetaBoard(pb);
    if (result.updated) {
      onProgress(`PetaBoard(${minimizeID(result.data.id)})`);
      await dbPetaBoard.update({ id: result.data.id }, result.data);
    }
  }, dbPetaBoard.getAll()).promise;
}
