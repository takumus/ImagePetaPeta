import { v4 as uuid } from "uuid";

export interface PetaTagPartition {
  name: string;
  id: string;
  index: number;
}

export function createPetaTagPartition(name: string, id?: string): PetaTagPartition {
  return {
    name: name,
    id: id || uuid(),
    index: 0,
  };
}
