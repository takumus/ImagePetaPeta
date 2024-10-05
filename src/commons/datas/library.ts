export interface Library {
  secure: boolean;
}
export function getDefaultLibrary(): Library {
  return {
    secure: false,
  } as const;
}
