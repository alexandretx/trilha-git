import { type ProgressSnapshot } from './progress';
import { readProgress } from './progress-document';

export interface ProgressStore {
  load(): Promise<ProgressSnapshot | null>;
  save(snapshot: ProgressSnapshot): Promise<void>;
}

export const PROGRESS_STORAGE_KEY = 'trilha-git.progress.v1';

export class MemoryProgressStore implements ProgressStore {
  constructor(private snapshot: ProgressSnapshot | null = null) {}

  async load(): Promise<ProgressSnapshot | null> {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  async save(snapshot: ProgressSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStorageProgressStore implements ProgressStore {
  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<ProgressSnapshot | null> {
    const raw = this.storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const read = readProgress(raw);
    if (!read.ok) throw new Error('progresso ilegível');
    if (read.changed) {
      try {
        this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(read.snapshot));
      } catch {
        // The cleaned copy stays in memory when storage refuses the write.
      }
    }
    return read.snapshot;
  }

  async save(snapshot: ProgressSnapshot): Promise<void> {
    this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
  }
}

export function browserProgressStore(): ProgressStore {
  if (typeof localStorage === 'undefined') return new MemoryProgressStore();
  return new LocalStorageProgressStore(localStorage);
}
