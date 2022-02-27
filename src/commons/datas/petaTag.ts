import { v4 as uuid } from "uuid";
export interface PetaTag {
  name: string,
  id: string,
  index: number,
  petaImages: string[]
}

export function createPetaTag(name: string): PetaTag {
  return {
    name: name,
    id: uuid(),
    index: 0,
    petaImages: []
  }
}