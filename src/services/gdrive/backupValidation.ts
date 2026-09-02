// Defensive validation for backup JSON read from Google Drive before it touches the local DB.
// Google Drive is technically a "trusted" store the user controls, but the file content isn't
// schema-checked anywhere upstream, so a corrupted/edited/partial backup shouldn't be able to
// silently poison IndexedDB with non-conforming records.

const isEntityWithId = (item: unknown): item is { id: string } =>
  typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string';

/** Keeps only well-formed entities (plain objects with a string `id`) from a raw, untrusted array. */
export const sanitizeEntityList = <T extends { id: string }>(list: unknown): T[] => {
  if (!Array.isArray(list)) return [];
  return list.filter(isEntityWithId) as T[];
};

/** Keeps only string ids from a raw, untrusted array. */
export const sanitizeIdList = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  return list.filter((id): id is string => typeof id === 'string');
};
