import { type ProgressSnapshot, type ReviewEntry, type TaskOutcome } from './progress';

export const PROGRESS_SCHEMA_VERSION = 1;
const MAX_DOCUMENT_CHARS = 200_000;
const MAX_ENTRIES = 400;
const MAX_ID = 80;

type Plain = Record<string, unknown>;

export type ProgressRead =
  | { ok: true; snapshot: ProgressSnapshot; changed: boolean }
  | { ok: false };

/**
 * Version N becomes version N+1. Version 1 is the first shape that was stored.
 * A missing version with the same two maps is read as version 1.
 */
const migrations: Record<number, (doc: Plain) => Plain> = {};

export function readProgress(raw: string): ProgressRead {
  if (raw.length > MAX_DOCUMENT_CHARS) return { ok: false };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  const snapshot = migrateProgress(value);
  if (!snapshot) return { ok: false };
  return { ok: true, snapshot, changed: JSON.stringify(snapshot) !== raw };
}

export function migrateProgress(value: unknown): ProgressSnapshot | null {
  if (!isPlain(value)) return null;
  let current = value;
  let version = current.version;
  if (version === undefined) {
    if (!isPlain(current.outcomes) || !isPlain(current.reviews)) return null;
    version = 1;
    current = { ...current, version: 1 };
  }
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  while (version < PROGRESS_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) return null;
    const next = step(current);
    if (!isPlain(next) || next.version !== version + 1) return null;
    current = next;
    version += 1;
  }
  // Leave a newer document unread so this build does not overwrite it.
  if (version !== PROGRESS_SCHEMA_VERSION) return null;
  return sanitizeV1(current);
}

function sanitizeV1(doc: Plain): ProgressSnapshot | null {
  if (!isPlain(doc.outcomes) || !isPlain(doc.reviews)) return null;
  const outcomes: Record<string, TaskOutcome> = {};
  for (const [key, entry] of Object.entries(doc.outcomes)) {
    if (Object.keys(outcomes).length >= MAX_ENTRIES) break;
    const clean = sanitizeOutcome(key, entry);
    if (clean) outcomes[key] = clean;
  }
  const reviews: Record<string, ReviewEntry> = {};
  for (const [key, entry] of Object.entries(doc.reviews)) {
    if (Object.keys(reviews).length >= MAX_ENTRIES) break;
    const clean = sanitizeReview(key, entry);
    if (clean) reviews[key] = clean;
  }
  return { version: 1, outcomes, reviews };
}

function sanitizeOutcome(key: string, value: unknown): TaskOutcome | null {
  if (!isId(key) || !isPlain(value)) return null;
  const taskId = value.taskId;
  const conceptId = value.conceptId;
  if (taskId !== key || !isId(conceptId)) return null;
  if (typeof value.solved !== 'boolean' || typeof value.firstTry !== 'boolean') return null;
  const attempts = finiteInteger(value.attempts, 0, 10_000);
  const hintsUsed = finiteInteger(value.hintsUsed, 0, 3);
  const at = finiteNumber(value.at);
  const score = finiteNumber(value.score);
  if (attempts === null || hintsUsed === null || at === null || score === null) return null;
  return {
    taskId,
    conceptId,
    solved: value.solved,
    attempts,
    hintsUsed,
    firstTry: value.firstTry,
    score: clamp01(score),
    at,
  };
}

function sanitizeReview(key: string, value: unknown): ReviewEntry | null {
  if (!isId(key) || !isPlain(value)) return null;
  if (value.taskId !== key) return null;
  const dueAt = finiteNumber(value.dueAt);
  const intervalDays = finiteNumber(value.intervalDays);
  const streak = finiteInteger(value.streak, 0, 10_000);
  if (dueAt === null || intervalDays === null || intervalDays < 0 || streak === null) return null;
  return { taskId: key, dueAt, intervalDays, streak };
}

function isPlain(value: unknown): value is Plain {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 31) return false;
  }
  return true;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function finiteInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return null;
  }
  return value;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
