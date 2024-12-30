import { v4 as uuid } from "uuid";

export interface Library {
  secure: boolean;
  id: string;
}
export function getDefaultLibrary(): Library {
  return {
    secure: false,
    id: uuid(),
  } as const;
}
