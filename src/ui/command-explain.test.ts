import { describe, expect, it } from 'vitest';
import { explainCommandError } from './command-explain';

describe('explainCommandError', () => {
  it('translates the errors a beginner hits first', () => {
    expect(
      explainCommandError('fatal: not a git repository (or any of the parent directories): .git\n'),
    ).toMatch(/git init/);
    expect(
      explainCommandError('falta a mensagem do commit. Use git commit -m "mensagem".\n'),
    ).toMatch(/aspas/);
    expect(
      explainCommandError('no changes added to commit (use "git add" and/or "git commit -a")\n'),
    ).toMatch(/área de stage/);
    expect(explainCommandError('nothing to commit, working tree clean\n')).toMatch(/iguais/);
  });

  it('stays quiet when there is nothing to add', () => {
    expect(explainCommandError('')).toBeNull();
    expect(explainCommandError('algo que esta trilha não classifica')).toBeNull();
  });
});
