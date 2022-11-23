export type Migrater<T> = (data: T) => { data: T; updated: boolean };
export function createMigrater<T>(
  migrater: (data: T, update: () => void) => Promise<T>,
): Migrater<T> {
  return (data: T) => {
    let updated = false;
    migrater(data, () => {
      updated = true;
    });
    return {
      data,
      updated,
    };
  };
}
