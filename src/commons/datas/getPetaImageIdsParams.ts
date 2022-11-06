export type GetPetaImageIdsParams =
  | { type: "all" }
  | { type: "untagged" }
  | { type: "petaTag"; petaTagIds: string[] };
