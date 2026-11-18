import { describe, expect, it } from 'vitest';
import {
  dueReviewIds,
  emptyProgress,
  levelMastery,
  levelUnlocked,
  recordOutcome,
} from '../../core/progress';
import { level1Tasks } from './level1';
import { level2Tasks } from './level2';
import { level3Tasks } from './level3';

const day = 86_400_000;

function solved(taskId: string, conceptId: string, at = 0, hintsUsed = 0) {
  return {
    taskId,
    conceptId,
    solved: true,
    attempts: 1,
    hintsUsed,
    firstTry: hintsUsed === 0,
    at,
  };
}

describe('progressão dos níveis 1 a 3', () => {
  it('unlocks Histórico after Básico and Branches after Histórico', () => {
    let snapshot = emptyProgress();
    for (const task of level1Tasks) {
      snapshot = recordOutcome(snapshot, solved(task.id, task.conceptId));
    }
    const basic = levelMastery(level1Tasks, snapshot.outcomes);
    expect(basic).toBe(1);
    expect(levelUnlocked(basic)).toBe(true);
    expect(levelUnlocked(levelMastery(level2Tasks, snapshot.outcomes))).toBe(false);

    for (const task of level2Tasks) {
      snapshot = recordOutcome(snapshot, solved(task.id, task.conceptId));
    }
    const history = levelMastery(level2Tasks, snapshot.outcomes);
    expect(history).toBe(1);
    expect(levelUnlocked(history)).toBe(true);
    expect(levelMastery(level3Tasks, snapshot.outcomes)).toBe(0);
  });

  it('queues a weak new concept from Histórico and from Branches', () => {
    const now = 5_000;
    const diffTask = level2Tasks.find((task) => task.conceptId === 'diff');
    const mergeTask = level3Tasks.find((task) => task.conceptId === 'merge');
    if (!diffTask || !mergeTask) throw new Error('tarefas em falta');

    let snapshot = recordOutcome(
      emptyProgress(),
      solved(diffTask.id, diffTask.conceptId, now, 2),
      now,
    );
    snapshot = recordOutcome(snapshot, solved(mergeTask.id, mergeTask.conceptId, now, 1), now);
    expect(levelMastery(level2Tasks, snapshot.outcomes)).toBeLessThan(0.8);
    expect(dueReviewIds(snapshot, now + day).sort()).toEqual([diffTask.id, mergeTask.id].sort());
  });
});
