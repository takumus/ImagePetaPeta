export type GetPetaFileIdsParams =
  | { type: "all" }
  | { type: "untagged" }
  | { type: "petaTag"; petaTagIds: string[] };
