import { v4 as uuid } from "uuid";

export interface Library {
  name: string;
  secure: boolean;
  id: string;
}
export function getDefaultLibrary(): Library {
  return {
    name: "noname",
    secure: false,
    id: uuid(),
  } as const;
}
