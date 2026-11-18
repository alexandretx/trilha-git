import { describe, expect, it } from 'vitest';
import { gradeGit } from '../../engines/git/grade';
import { GitSession } from '../../engines/git/session';
import { level2Tasks } from './level2';

const solutions: Record<string, string[]> = {
  'ver-diff': ['git diff', 'echo 9 > preco.txt'],
  'ver-diff-stage': ['git diff --staged', 'echo 10 > preco.txt'],
  'ler-commit-antigo': ['git show HEAD~1', 'echo 8 > antes.txt'],
  'descartar-edicao': ['git restore cardapio.txt'],
  'tirar-do-stage': ['git restore --staged cardapio.txt'],
  'refazer-mensagem': ['git reset --soft HEAD~1', 'git commit -m "abre o caixa"'],
  'devolver-para-a-pasta': ['git reset HEAD~1'],
  'apagar-commit-local': ['git reset --hard HEAD~1'],
  'desfazer-commit-publicado': ['git revert HEAD'],
};

function finish(id: string, lines: string[]) {
  const task = level2Tasks.find((item) => item.id === id);
  if (!task) throw new Error(id);
  const repo = new GitSession(task.initialState);
  for (const line of lines) repo.execute(line);
  return gradeGit(repo.getState(), task.checks, repo.history());
}

describe('nível histórico', () => {
  it('lists the tasks, concepts, and three hints each', () => {
    expect(level2Tasks).toHaveLength(9);
    expect(new Set(level2Tasks.map((task) => task.id)).size).toBe(9);
    expect(new Set(level2Tasks.map((task) => task.conceptId))).toEqual(
      new Set(['diff', 'show', 'restore', 'reset', 'revert']),
    );
    expect(level2Tasks.every((task) => task.hints.length === 3)).toBe(true);
    expect(level2Tasks.every((task) => !task.scenario.includes('—'))).toBe(true);
    expect(level2Tasks.every((task) => !task.explanation.includes('—'))).toBe(true);
  });

  it.each(level2Tasks.map((task) => [task.id]))('%s passes with a valid sequence', (id) => {
    expect(finish(id, solutions[id] ?? []).passed).toBe(true);
  });

  it('accepts git reset as another way to unstage', () => {
    expect(finish('tirar-do-stage', ['git reset']).passed).toBe(true);
  });

  it('accepts a manual inverse commit when the shared commit stays in history', () => {
    const result = finish('desfazer-commit-publicado', [
      'echo "cafe 8" > cardapio.txt',
      'git commit -am "devolve o preco"',
    ]);
    expect(result.passed).toBe(true);
  });

  it('rejects reset --hard when the shared commit must stay', () => {
    const result = finish('desfazer-commit-publicado', ['git reset --hard HEAD~1']);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toContain('histórico');
  });

  it('rejects a diff answer that commits the price change', () => {
    const result = finish('ver-diff', [
      'git diff',
      'git add cardapio.txt',
      'git commit -m "sobe"',
      'echo 9 > preco.txt',
    ]);
    expect(result.passed).toBe(false);
  });
});
