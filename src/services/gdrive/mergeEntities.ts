// Pure, unit-testable merge logic shared by the Google Drive sync engine.

/** Merges local and remote entity lists, keeping the newest (by updatedAt) non-deleted version of each id. */
export const mergeEntities = <T extends { id: string; updatedAt?: number }>(
  localList: T[],
  remoteList: T[],
  deletedIds: Set<string>
): T[] => {
  const map = new Map<string, T>();
  const getItemTimestamp = (item: T): number => item.updatedAt ?? 0;

  // 1. Populate local items, excluding deleted
  localList.forEach((item) => {
    if (!deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  });

  // 2. Merge remote items (skip deleted)
  remoteList.forEach((remoteItem) => {
    if (deletedIds.has(remoteItem.id)) {
      return;
    }

    const localItem = map.get(remoteItem.id);
    if (!localItem || getItemTimestamp(remoteItem) > getItemTimestamp(localItem)) {
      map.set(remoteItem.id, remoteItem);
    }
  });

  return Array.from(map.values());
};

/** Order-independent equality check by id, used to detect whether a merge actually changed anything. */
export const areEntityListsEqual = <T extends { id: string }>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  const sortById = (list: T[]) => [...list].sort((x, y) => x.id.localeCompare(y.id));
  return JSON.stringify(sortById(a)) === JSON.stringify(sortById(b));
};

/** Order-independent equality check for id lists (e.g. tombstones). */
export const areIdListsEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
};

