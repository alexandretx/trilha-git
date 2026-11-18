import { describe, expect, it } from 'vitest';
import { gradeGit } from '../../engines/git/grade';
import { GitSession } from '../../engines/git/session';
import { level3Tasks } from './level3';

const solutions: Record<string, string[]> = {
  'abrir-branch': ['git branch ajuste'],
  'anotar-branches': ['git branch', 'echo promocao > branch.txt'],
  'apagar-branch-antiga': ['git branch -d rascunho'],
  'entrar-na-branch': ['git switch promocao'],
  'commit-na-branch': [
    'git switch -c porcao',
    'echo meia > porcao.txt',
    'git add porcao.txt',
    'git commit -m "abre porcao"',
  ],
  'voltar-para-main': [
    'echo "cafe 7" > cardapio.txt',
    'git commit -am "promocao"',
    'git switch main',
  ],
  'avancar-main': ['git merge promocao'],
  'juntar-arquivos': ['git merge promocao'],
  'resolver-conflito': [
    'git merge promocao',
    'echo "cafe 9\\ncafe 7" > cardapio.txt',
    'git add cardapio.txt',
    'git commit -m "une o cardapio"',
  ],
  'abortar-merge': ['git merge lote', 'git merge --abort'],
};

function finish(id: string, lines: string[]) {
  const task = level3Tasks.find((item) => item.id === id);
  if (!task) throw new Error(id);
  const repo = new GitSession(task.initialState);
  for (const line of lines) repo.execute(line);
  return gradeGit(repo.getState(), task.checks, repo.history());
}

describe('nível branches', () => {
  it('lists the tasks, concepts, and three hints each', () => {
    expect(level3Tasks).toHaveLength(10);
    expect(new Set(level3Tasks.map((task) => task.id)).size).toBe(10);
    expect(new Set(level3Tasks.map((task) => task.conceptId))).toEqual(
      new Set(['branch', 'switch', 'merge']),
    );
    expect(level3Tasks.every((task) => task.hints.length === 3)).toBe(true);
    expect(level3Tasks.every((task) => !task.scenario.includes('—'))).toBe(true);
  });

  it.each(level3Tasks.map((task) => [task.id]))('%s passes with a valid sequence', (id) => {
    const result = finish(id, solutions[id] ?? []);
    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('accepts checkout for a branch that already exists', () => {
    expect(finish('entrar-na-branch', ['git checkout promocao']).passed).toBe(true);
  });

  it('accepts checkout -b when the task is to create a branch and commit on it', () => {
    expect(
      finish('commit-na-branch', [
        'git checkout -b porcao',
        'echo meia > porcao.txt',
        'git add porcao.txt',
        'git commit -m "porcao nova"',
      ]).passed,
    ).toBe(true);
  });

  it('rejects a conflict left unresolved', () => {
    const result = finish('resolver-conflito', ['git merge promocao']);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toContain('cardapio');
  });

  it('rejects an abort that never started the merge', () => {
    const result = finish('abortar-merge', ['git merge --abort']);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toContain('lote');
  });

  it('rejects finishing the wrong merge instead of aborting', () => {
    const result = finish('abortar-merge', [
      'git merge lote',
      'echo "12 unidades" > estoque.txt',
      'git add estoque.txt',
      'git commit -m "fica o estoque"',
    ]);
    expect(result.passed).toBe(false);
  });
});
