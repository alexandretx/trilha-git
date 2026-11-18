export const UNLOCK_AT = 0.8;
const DAY_MS = 86_400_000;
const HINT_FACTOR = [1, 0.8, 0.6, 0.4] as const;

export interface TaskOutcome {
  taskId: string;
  conceptId: string;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  firstTry: boolean;
  score: number;
  at: number;
}

export interface ReviewEntry {
  taskId: string;
  dueAt: number;
  intervalDays: number;
  streak: number;
}

export interface ProgressSnapshot {
  version: 1;
  outcomes: Record<string, TaskOutcome>;
  reviews: Record<string, ReviewEntry>;
}

export interface ConceptTask {
  id: string;
  conceptId: string;
}

export function emptyProgress(): ProgressSnapshot {
  return { version: 1, outcomes: {}, reviews: {} };
}

export function scoreAttempt(input: {
  solved: boolean;
  firstTry: boolean;
  hintsUsed: number;
}): number {
  if (!input.solved) return 0;
  const hints = Math.min(3, Math.max(0, Math.floor(input.hintsUsed)));
  const hintFactor = HINT_FACTOR[hints] ?? 0.4;
  const attemptFactor = input.firstTry ? 1 : 0.75;
  return Math.round(hintFactor * attemptFactor * 100) / 100;
}

export function conceptMastery(
  conceptId: string,
  tasks: readonly ConceptTask[],
  outcomes: Record<string, TaskOutcome>,
): number {
  const related = tasks.filter((task) => task.conceptId === conceptId);
  if (related.length === 0) return 0;
  const total = related.reduce((sum, task) => sum + (outcomes[task.id]?.score ?? 0), 0);
  return total / related.length;
}

/** Average of the concepts in the level. A concept with two tasks does not count twice. */
export function levelMastery(
  tasks: readonly ConceptTask[],
  outcomes: Record<string, TaskOutcome>,
): number {
  const concepts = [...new Set(tasks.map((task) => task.conceptId))];
  if (concepts.length === 0) return 0;
  const total = concepts.reduce(
    (sum, conceptId) => sum + conceptMastery(conceptId, tasks, outcomes),
    0,
  );
  return total / concepts.length;
}

/** The first level passes null. Every later level passes the mastery of the one before it. */
export function levelUnlocked(previousMastery: number | null): boolean {
  if (previousMastery === null) return true;
  return previousMastery + 1e-9 >= UNLOCK_AT;
}

export function scheduleReview(
  score: number,
  now: number,
  previous?: ReviewEntry,
): Omit<ReviewEntry, 'taskId'> | null {
  if (score >= 0.95) return null;
  let intervalDays: number;
  let streak: number;
  if (score >= 0.75) {
    streak = (previous?.streak ?? 0) + 1;
    intervalDays = previous ? Math.max(1, Math.round(previous.intervalDays * 1.5)) : 2;
  } else if (score > 0) {
    streak = 0;
    intervalDays = 1;
  } else {
    streak = 0;
    intervalDays = 0.5;
  }
  return { dueAt: now + intervalDays * DAY_MS, intervalDays, streak };
}

export function recordOutcome(
  snapshot: ProgressSnapshot,
  input: Omit<TaskOutcome, 'score'>,
  now = input.at,
): ProgressSnapshot {
  const score = scoreAttempt(input);
  const outcome: TaskOutcome = { ...input, score };
  const reviews = { ...snapshot.reviews };
  const next = scheduleReview(score, now, reviews[input.taskId]);
  if (next) reviews[input.taskId] = { taskId: input.taskId, ...next };
  else delete reviews[input.taskId];
  return {
    version: 1,
    outcomes: { ...snapshot.outcomes, [input.taskId]: outcome },
    reviews,
  };
}

export function dueReviewIds(snapshot: ProgressSnapshot, now: number): string[] {
  return Object.values(snapshot.reviews)
    .filter((entry) => entry.dueAt <= now)
    .sort((left, right) => left.dueAt - right.dueAt || left.taskId.localeCompare(right.taskId))
    .map((entry) => entry.taskId);
}
