import { createKey } from "@/main/utils/di";
export interface Paths {
  DIR_ROOT: string;
  DIR_APP: string;
  DIR_LOG: string;
  DIR_IMAGES: string;
  DIR_THUMBNAILS: string;
  DIR_TEMP: string;
  FILE_IMAGES_DB: string;
  FILE_BOARDS_DB: string;
  FILE_TAGS_DB: string;
  FILE_TAG_PARTITIONS_DB: string;
  FILE_IMAGES_TAGS_DB: string;
  FILE_SETTINGS: string;
  FILE_STATES: string;
  FILE_WINDOW_STATES: string;
  FILE_DBINFO: string;
}
export const pathsKey = createKey<Paths>("paths");
