export function ObjectKeys<T extends {}>(obj: T) {
  return Object.keys(obj) as (keyof T)[];
}
