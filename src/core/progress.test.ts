import { describe, expect, it } from 'vitest';
import {
  conceptMastery,
  dueReviewIds,
  emptyProgress,
  levelMastery,
  levelUnlocked,
  recordOutcome,
  scoreAttempt,
  UNLOCK_AT,
} from './progress';
import {
  LocalStorageProgressStore,
  MemoryProgressStore,
  PROGRESS_STORAGE_KEY,
} from './progress-store';

const tasks = [
  { id: 'init', conceptId: 'init' },
  { id: 'add-one', conceptId: 'add' },
  { id: 'add-two', conceptId: 'add' },
  { id: 'commit', conceptId: 'commit' },
];

function outcome(
  taskId: string,
  conceptId: string,
  overrides: Partial<Parameters<typeof recordOutcome>[1]> = {},
) {
  return {
    taskId,
    conceptId,
    solved: true,
    attempts: 1,
    hintsUsed: 0,
    firstTry: true,
    at: 1_000,
    ...overrides,
  };
}

describe('mastery', () => {
  it('weighs a first try above hints and retries', () => {
    expect(scoreAttempt({ solved: true, firstTry: true, hintsUsed: 0 })).toBe(1);
    expect(scoreAttempt({ solved: true, firstTry: true, hintsUsed: 1 })).toBe(0.8);
    expect(scoreAttempt({ solved: true, firstTry: true, hintsUsed: 2 })).toBe(0.6);
    expect(scoreAttempt({ solved: true, firstTry: true, hintsUsed: 3 })).toBe(0.4);
    expect(scoreAttempt({ solved: true, firstTry: false, hintsUsed: 0 })).toBe(0.75);
    expect(scoreAttempt({ solved: true, firstTry: false, hintsUsed: 1 })).toBe(0.6);
    expect(scoreAttempt({ solved: false, firstTry: false, hintsUsed: 0 })).toBe(0);
  });

  it('averages concepts, then averages those concepts for the level', () => {
    let snapshot = emptyProgress();
    snapshot = recordOutcome(snapshot, outcome('init', 'init'));
    snapshot = recordOutcome(snapshot, outcome('add-one', 'add', { hintsUsed: 3, firstTry: true }));
    snapshot = recordOutcome(snapshot, outcome('add-two', 'add'));
    snapshot = recordOutcome(
      snapshot,
      outcome('commit', 'commit', { solved: false, firstTry: false }),
    );

    expect(conceptMastery('add', tasks, snapshot.outcomes)).toBeCloseTo(0.7);
    expect(levelMastery(tasks, snapshot.outcomes)).toBeCloseTo((1 + 0.7 + 0) / 3);
    expect(levelMastery([], snapshot.outcomes)).toBe(0);
  });

  it('unlocks the next level at 80 percent of the previous one', () => {
    expect(levelUnlocked(null)).toBe(true);
    expect(levelUnlocked(UNLOCK_AT)).toBe(true);
    expect(levelUnlocked(0.799)).toBe(false);
    expect(levelUnlocked(0)).toBe(false);
  });
});

describe('review queue', () => {
  it('brings a weak result back and drops a clean one', () => {
    const now = 10_000;
    const weak = recordOutcome(
      emptyProgress(),
      outcome('add-one', 'add', { hintsUsed: 2, at: now }),
      now,
    );
    expect(weak.reviews['add-one']?.intervalDays).toBe(1);
    expect(dueReviewIds(weak, now)).toEqual([]);
    expect(dueReviewIds(weak, now + 86_400_000)).toEqual(['add-one']);

    const failed = recordOutcome(
      emptyProgress(),
      outcome('add-one', 'add', { solved: false, firstTry: false, at: now }),
      now,
    );
    expect(failed.reviews['add-one']?.intervalDays).toBe(0.5);

    const clean = recordOutcome(weak, outcome('add-one', 'add', { at: now + 5 }), now + 5);
    expect(clean.reviews['add-one']).toBeUndefined();
    expect(clean.outcomes['add-one']?.score).toBe(1);
  });

  it('stretches the interval after a decent retry', () => {
    const now = 0;
    const first = recordOutcome(
      emptyProgress(),
      outcome('commit', 'commit', { firstTry: false, at: now }),
      now,
    );
    expect(first.reviews.commit?.intervalDays).toBe(2);
    const second = recordOutcome(
      first,
      outcome('commit', 'commit', { firstTry: false, hintsUsed: 1, at: now + 1 }),
      now + 1,
    );
    expect(second.reviews.commit?.intervalDays).toBe(1);
    const third = recordOutcome(
      second,
      outcome('commit', 'commit', { firstTry: false, at: now + 2 }),
      now + 2,
    );
    expect(third.reviews.commit?.streak).toBe(1);
    expect(third.reviews.commit?.intervalDays).toBe(2);
  });
});

describe('ProgressStore', () => {
  it('round-trips a snapshot in memory', async () => {
    const store = new MemoryProgressStore();
    expect(await store.load()).toBeNull();
    const snapshot = recordOutcome(emptyProgress(), outcome('init', 'init'));
    await store.save(snapshot);
    const loaded = await store.load();
    expect(loaded).toEqual(snapshot);
    if (!loaded) return;
    loaded.outcomes.init = { ...loaded.outcomes.init!, score: 0 };
    expect((await store.load())?.outcomes.init?.score).toBe(1);
  });

  it('persists JSON and rejects a corrupt document', async () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const store = new LocalStorageProgressStore(storage);
    const snapshot = recordOutcome(emptyProgress(), outcome('init', 'init'));
    await store.save(snapshot);
    expect(data.get(PROGRESS_STORAGE_KEY)).toContain('"version":1');
    expect(await store.load()).toEqual(snapshot);

    data.set(PROGRESS_STORAGE_KEY, '{');
    await expect(store.load()).rejects.toThrow('progresso ilegível');
    data.set(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 2 }));
    await expect(store.load()).rejects.toThrow('progresso ilegível');
  });
});
