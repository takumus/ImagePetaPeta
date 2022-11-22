export interface DBInfo {
  version: string;
}
export function getDefaultDBInfo(): DBInfo {
  return {
    version: "-1",
  } as const;
}
