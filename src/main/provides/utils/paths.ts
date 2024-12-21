import { createKey, createUseFunction } from "@/main/libs/di";

export interface LibraryPaths {
  DIR_ROOT: string;
  DIR_IMAGES: string;
  DIR_THUMBNAILS: string;
  DIR_FEATURE_VECTORS: string;
  FILE_IMAGES_DB: string;
  FILE_BOARDS_DB: string;
  FILE_TAGS_DB: string;
  FILE_TAG_PARTITIONS_DB: string;
  FILE_IMAGES_TAGS_DB: string;
  FILE_DBINFO: string;
}
export interface AppPaths {
  DIR_APP: string;
  DIR_LOG: string;
  DIR_TEMP: string;
  FILE_STATES: string;
  FILE_SETTINGS: string;
}
export const libraryPathsKey = createKey<LibraryPaths>("libpaths");
export const useLibraryPaths = createUseFunction(libraryPathsKey);

export const appPathsKey = createKey<AppPaths>("apppaths");
export const useAppPaths = createUseFunction(appPathsKey);
