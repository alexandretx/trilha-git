import { describe, expect, it } from 'vitest';
import { gradeGit } from '../../engines/git/grade';
import { GitSession } from '../../engines/git/session';
import { level1Tasks } from './level1';
import { gitPack } from './pack';

const solutions: Record<string, string[]> = {
  'iniciar-repositorio': ['git init'],
  'ler-status': ['echo ideia inicial > notas.txt', 'git status'],
  'preparar-commit': ['git add notas.txt'],
  'primeiro-commit': ['git commit -m "adiciona notas"'],
  'segundo-commit': [
    'echo Olá > leia-me.txt',
    'git add leia-me.txt',
    'git commit -m "cria leia-me"',
  ],
  'ler-o-log': ['git log --oneline', 'echo "adiciona notas" > resumo.txt'],
  'escolher-arquivos': ['git add app.txt teste.txt', 'git commit -m "sobe app"'],
  'atualizar-arquivo': ['echo 0.2 > versao.txt', 'git commit -am "sobe versao"'],
};

function finish(id: string, lines: string[]) {
  const task = level1Tasks.find((item) => item.id === id);
  if (!task) throw new Error(id);
  const repo = new GitSession(task.initialState);
  for (const line of lines) repo.execute(line);
  return gradeGit(repo.getState(), task.checks, repo.history());
}

describe('nível básico', () => {
  it('lists eight tasks and keeps the later levels visible but empty', () => {
    expect(level1Tasks).toHaveLength(8);
    expect(new Set(level1Tasks.map((task) => task.id)).size).toBe(8);
    expect(new Set(level1Tasks.map((task) => task.conceptId))).toEqual(
      new Set(['init', 'status', 'add', 'commit', 'log']),
    );
    expect(level1Tasks.every((task) => task.hints.length === 3)).toBe(true);
    expect(gitPack.engineId).toBe('git');
    expect(gitPack.levels.map((level) => level.tasks.length)).toEqual([8, 0, 0, 0, 0]);
  });

  it.each(level1Tasks.map((task) => [task.id]))('%s passes with a valid sequence', (id) => {
    expect(finish(id, solutions[id] ?? []).passed).toBe(true);
  });

  it('accepts git add . when every file in the folder belongs in the stage', () => {
    expect(finish('preparar-commit', ['git add .']).passed).toBe(true);
  });

  it('rejects git add . when a draft must stay out of the commit', () => {
    const result = finish('escolher-arquivos', ['git add .', 'git commit -m "sobe app"']);
    expect(result.passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes('rascunho'))).toBe(true);
  });

  it('rejects a commit whose message misses the word the task asked for', () => {
    const result = finish('primeiro-commit', ['git commit -m "primeiro"']);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toContain('notas');
  });
});
