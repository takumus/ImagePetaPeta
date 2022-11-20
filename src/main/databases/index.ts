import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import DB from "@/main/storages/db";
import { createKey } from "@/main/utils/di";

export const dbPetaImagesKey = createKey<DB<PetaImage>>("dbPetaImages");
export const dbPetaTagsKey = createKey<DB<PetaTag>>("dbPetaTags");
export const dbPetaBoardsKey = createKey<DB<PetaBoard>>("dbPetaBoards");
export const dbPetaTagPartitionsKey = createKey<DB<PetaTagPartition>>("dbPetaTagPartitions");
export const dbPetaImagesPetaTagsKey = createKey<DB<PetaImagePetaTag>>("dbPetaImagesPetaTags");
