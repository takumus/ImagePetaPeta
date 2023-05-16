export type Migrater<T> = (data: T) => Promise<{ data: T; updated: boolean }>;
export type SyncMigrater<T> = (
  ...args: Parameters<Migrater<T>>
) => Awaited<ReturnType<Migrater<T>>>;
export function createSyncMigrater<T>(
  migrater: (data: T, update: () => void) => T,
): SyncMigrater<T> {
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
export function createMigrater<T>(
  migrater: (data: T, update: () => void) => Promise<T>,
): Migrater<T> {
  return async (data: T) => {
    let updated = false;
    await migrater(data, () => {
      updated = true;
    });
    return {
      data,
      updated,
    };
  };
}
