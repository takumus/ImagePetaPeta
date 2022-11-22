import { v4 as uuid } from "uuid";

export interface PetaTag {
  name: string;
  id: string;
  index: number;
}

export function createPetaTag(name: string, id?: string): PetaTag {
  return {
    name: name,
    id: id || uuid(),
    index: 0,
  };
}
