import { type ProgressSnapshot } from './progress';

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
    return parseSnapshot(raw);
  }

  async save(snapshot: ProgressSnapshot): Promise<void> {
    this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
  }
}

export function browserProgressStore(): ProgressStore {
  if (typeof localStorage === 'undefined') return new MemoryProgressStore();
  return new LocalStorageProgressStore(localStorage);
}

function parseSnapshot(raw: string): ProgressSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('progresso ilegível');
  }
  if (!isSnapshot(value)) throw new Error('progresso ilegível');
  return value;
}

function isSnapshot(value: unknown): value is ProgressSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1 && isRecord(record.outcomes) && isRecord(record.reviews);
}

function isRecord(value: unknown): value is Record<string, never> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
