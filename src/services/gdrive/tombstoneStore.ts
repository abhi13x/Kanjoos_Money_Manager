const MAX_TOMBSTONES = 2000;

/** Tracks locally-deleted entity ids so a Google Drive sync doesn't resurrect them from a stale backup. */
export class GDriveTombstoneStore {
  private deletedKey: string;

  constructor(deletedKey: string) {
    this.deletedKey = deletedKey;
  }

  configure(deletedKey?: string): void {
    if (deletedKey) this.deletedKey = deletedKey;
  }

  markAsDeleted(id: string): void {
    try {
      const deleted = this.getDeletedIds();
      deleted.add(id);
      // Keep only the most recent tombstones so this list can't grow unbounded
      const trimmed = Array.from(deleted).slice(-MAX_TOMBSTONES);
      localStorage.setItem(this.deletedKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to record deleted ID locally:', e);
    }
  }

  getDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.deletedKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  clear(): void {
    localStorage.removeItem(this.deletedKey);
  }

  /** The localStorage key name this store reads/writes. */
  getStorageKey(): string {
    return this.deletedKey;
  }
}
