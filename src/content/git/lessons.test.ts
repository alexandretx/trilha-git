import { describe, expect, it } from 'vitest';
import { lessonGaps, missingLessonTerms } from '../../core/lesson';
import type { Lesson } from '../../core/types';
import { level1Tasks } from './level1';
import { level2Tasks } from './level2';
import { level3Tasks } from './level3';

const tasks = [...level1Tasks, ...level2Tasks, ...level3Tasks];

const beginnerTerms = [
  'terminal',
  'repositório',
  'commit',
  'diretório de trabalho',
  'área de stage',
];

function lessonText(lesson: Lesson): string {
  return JSON.stringify(lesson);
}

describe('lições dos níveis 1 a 3', () => {
  it('gives every task a lesson thick enough to teach from', () => {
    const gaps = tasks.flatMap((task) => lessonGaps(task.lesson).map((gap) => `${task.id}:${gap}`));
    expect(gaps).toEqual([]);
  });

  it('defines the first words before the learner is asked to use them', () => {
    expect(
      missingLessonTerms(
        level1Tasks.slice(0, 4).map((task) => task.lesson),
        beginnerTerms,
      ),
    ).toEqual([]);
  });

  it('does not print the hidden answer of a reading task', () => {
    const hidden: Record<string, string[]> = {
      'ler-o-log': ['adiciona notas'],
      'ver-diff': ['echo 9', 'cafe 9'],
      'ver-diff-stage': ['echo 10', 'cafe 10'],
      'ler-commit-antigo': ['cafe 8', 'echo 8'],
      'anotar-branches': ['promocao'],
    };
    for (const [id, banned] of Object.entries(hidden)) {
      const task = tasks.find((item) => item.id === id);
      if (!task) throw new Error(id);
      const text = lessonText(task.lesson);
      for (const word of banned) {
        expect(text.includes(word), `${id} vazou ${word}`).toBe(false);
      }
    }
  });
});
