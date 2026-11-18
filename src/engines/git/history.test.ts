import { describe, expect, it } from 'vitest';
import { gradeGit } from './grade';
import { hashBlob } from './objects';
import { mergeFileText } from './diff';
import type { GitInitialState } from './repo';
import { GitSession } from './session';

const fixed = { now: () => Date.UTC(2026, 10, 18, 15, 0, 0) };

function session(initial?: GitInitialState) {
  return new GitSession(initial, fixed);
}

function linear() {
  return session({
    commits: [
      { message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } },
      { message: 'sobe', files: { 'cardapio.txt': 'cafe 9\n', 'extra.txt': 'ok\n' } },
    ],
  });
}

describe('diff text', () => {
  it('merges edits on different lines and conflicts on the same line', () => {
    const clean = mergeFileText('a\nb\nc\n', 'a\nB\nc\n', 'a\nb\nC\n');
    expect(clean.conflict).toBe(false);
    expect(clean.content).toBe('a\nB\nC\n');

    const same = mergeFileText('a\nb\nc\n', 'a\nB\nc\n', 'a\nB\nc\n');
    expect(same.conflict).toBe(false);
    expect(same.content).toBe('a\nB\nc\n');

    const conflict = mergeFileText('cafe 8\n', 'cafe 9\n', 'cafe 7\n', 'HEAD', 'promocao');
    expect(conflict.conflict).toBe(true);
    expect(conflict.content).toBe('<<<<<<< HEAD\ncafe 9\n=======\ncafe 7\n>>>>>>> promocao\n');
  });
});

describe('git diff, show, restore, reset, revert', () => {
  it('prints a unified diff of the worktree and hides a staged change until --staged', () => {
    const repo = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } }],
    });
    repo.execute('echo cafe 9 > cardapio.txt');
    const oldId = hashBlob('cafe 8\n').oid.slice(0, 7);
    const newId = hashBlob('cafe 9\n').oid.slice(0, 7);
    expect(repo.execute('git diff').stdout).toBe(
      [
        'diff --git a/cardapio.txt b/cardapio.txt',
        `index ${oldId}..${newId} 100644`,
        '--- a/cardapio.txt',
        '+++ b/cardapio.txt',
        '@@ -1 +1 @@',
        '-cafe 8',
        '+cafe 9',
        '',
      ].join('\n'),
    );
    expect(repo.execute('git diff --staged').stdout).toBe('');

    repo.execute('git add cardapio.txt');
    repo.execute('echo cafe 8 > cardapio.txt');
    const staged = repo.execute('git diff --staged').stdout;
    expect(staged).toContain('+cafe 9');
    expect(repo.execute('git diff --cached').stdout).toContain('+cafe 9');
    expect(repo.execute('git diff cardapio.txt').stdout).toContain('-cafe 9');
    expect(repo.execute('git diff HEAD').stderr).toContain('não entra nesta trilha');
    expect(repo.execute('git diff --stat').exitCode).toBe(1);
  });

  it('shows a new file, a deletion, and skips untracked files', () => {
    const repo = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } }],
    });
    repo.execute('echo nota > solto.txt');
    expect(repo.execute('git diff').stdout).toBe('');
    repo.execute('git add solto.txt');
    expect(repo.execute('git diff --staged').stdout).toContain('new file mode 100644');
    expect(repo.execute('git diff --staged').stdout).toContain('--- /dev/null');
    repo.execute('git commit -m "solto"');
    repo.execute('rm solto.txt');
    repo.execute('git add solto.txt');
    expect(repo.execute('git diff --staged').stdout).toContain('deleted file mode 100644');
    expect(repo.execute('git diff --staged').stdout).toContain('+++ /dev/null');
  });

  it('marks a missing newline and treats a null byte as binary', () => {
    const repo = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n', 'bin.dat': 'a\0b' } }],
    });
    repo.execute('echo -n cafe 8 > cardapio.txt');
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 8');
    expect(repo.execute('git diff cardapio.txt').stdout).toContain('\\ No newline at end of file');
    repo.execute('echo -n x > bin.dat');
    expect(repo.execute('git diff bin.dat').stdout).toContain(
      'Binary files a/bin.dat and b/bin.dat differ',
    );
  });

  it('shows HEAD, an older commit, and a second parent after a merge', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'main1',
          message: 'horario',
          files: { 'cardapio.txt': 'cafe 8\n', 'horario.txt': '8h\n' },
          parents: ['base'],
        },
        {
          id: 'pro',
          message: 'aviso da casa',
          files: { 'cardapio.txt': 'cafe 8\n', 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    });
    const older = repo.execute('git show HEAD~1');
    expect(older.exitCode).toBe(0);
    expect(older.stdout).toContain('base');
    expect(older.stdout).toContain('cafe 8');
    expect(older.stdout).toContain('Author: Estudante <estudante@trilha.local>');
    expect(repo.execute('git show promocao').stdout).toContain('aviso da casa');
    expect(repo.execute('git merge promocao').exitCode).toBe(0);
    const second = repo.execute('git show HEAD^2');
    expect(second.stdout).toContain('aviso da casa');
    expect(repo.execute('git show').stdout).toContain('Merge:');
    expect(repo.execute('git show --oneline').exitCode).toBe(1);
    expect(repo.execute('git show').stdout).not.toContain('aviso da casa');
  });

  it('restores a worktree edit, a deletion, and a staged file', () => {
    const repo = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n', 'extra.txt': 'ok\n' } }],
    });
    repo.execute('echo cafe 0 > cardapio.txt');
    expect(repo.execute('git restore cardapio.txt').exitCode).toBe(0);
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 8\n');

    repo.execute('rm extra.txt');
    repo.execute('git restore extra.txt');
    expect(repo.getState().worktree['extra.txt']).toBe('ok\n');

    repo.execute('echo cafe 9 > cardapio.txt');
    repo.execute('git add cardapio.txt');
    repo.execute('git restore --staged cardapio.txt');
    expect(repo.getState().index['cardapio.txt']).toBe('cafe 8\n');
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 9\n');

    repo.execute('git add cardapio.txt');
    repo.execute('git restore --staged --worktree cardapio.txt');
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 8\n');
    expect(repo.getState().index['cardapio.txt']).toBe('cafe 8\n');

    repo.execute('echo novo > novo.txt');
    repo.execute('git add novo.txt');
    repo.execute('git restore --staged novo.txt');
    expect(repo.getState().index['novo.txt']).toBeUndefined();
    expect(repo.getState().worktree['novo.txt']).toBe('novo\n');

    expect(repo.execute('git restore').stderr).toContain('you must specify path');
    expect(repo.execute('git restore sumiu.txt').stderr).toContain('did not match');
    expect(repo.execute('git restore ../fora').stderr).toContain('fora do repositório');
  });

  it('resets soft, mixed, and hard, and only moves the current branch', () => {
    const repo = linear();
    const feature = repo.execute('git branch lado HEAD');
    expect(feature.exitCode).toBe(0);
    const soft = repo.execute('git reset --soft HEAD~1');
    expect(soft.stdout).toBe('');
    expect(soft.exitCode).toBe(0);
    let state = repo.getState();
    expect(state.head && state.commits[state.head]?.message).toBe('abre');
    expect(state.index['extra.txt']).toBe('ok\n');
    expect(state.index['cardapio.txt']).toBe('cafe 9\n');
    expect(state.worktree['extra.txt']).toBe('ok\n');
    expect(state.branches.lado).not.toBe(state.head);

    const again = linear();
    const mixed = again.execute('git reset HEAD~1');
    expect(mixed.stdout).toContain('Unstaged changes after reset:');
    expect(mixed.stdout).toContain('M\tcardapio.txt');
    state = again.getState();
    expect(state.head && state.commits[state.head]?.message).toBe('abre');
    expect(state.index).toEqual({ 'cardapio.txt': 'cafe 8\n' });
    expect(state.worktree['extra.txt']).toBe('ok\n');
    expect(state.worktree['cardapio.txt']).toBe('cafe 9\n');

    const hard = linear();
    const wiped = hard.execute('git reset --hard HEAD~1');
    expect(wiped.stdout).toMatch(/^HEAD is now at [0-9a-f]{7} abre\n$/);
    state = hard.getState();
    expect(state.worktree).toEqual({ 'cardapio.txt': 'cafe 8\n' });
    expect(state.index).toEqual(state.worktree);
    expect(state.commits[state.branches.main ?? '']?.message).toBe('abre');
    expect(hard.execute('git reset --soft --hard').exitCode).toBe(1);
    expect(hard.execute('git reset --hard cardapio.txt HEAD').stderr).toContain('caminho');
    expect(hard.execute('git reset --hard nenhum').exitCode).toBe(128);
  });

  it('refuses a hard reset that would overwrite an untracked file', () => {
    const repo = session({
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'b',
          message: 'novo',
          files: { 'cardapio.txt': 'cafe 8\n', 'novo.txt': 'sim\n' },
          parents: ['a'],
        },
      ],
      branches: { main: 'a', lado: 'b' },
    });
    repo.execute('echo nao > novo.txt');
    const blocked = repo.execute('git reset --hard lado');
    expect(blocked.exitCode).toBe(1);
    expect(blocked.stderr).toContain('untracked working tree files');
    const blockedState = repo.getState();
    expect(blockedState.head && blockedState.commits[blockedState.head]?.message).toBe('abre');
    repo.execute('echo sim > novo.txt');
    expect(repo.execute('git reset --hard lado').exitCode).toBe(0);
    expect(repo.getState().worktree['novo.txt']).toBe('sim\n');
  });

  it('reverts a shared commit and keeps it in the history', () => {
    const repo = linear();
    const dirty = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } }],
    });
    dirty.execute('echo cafe 1 > cardapio.txt');
    expect(dirty.execute('git revert HEAD').stderr).toContain('revert failed');
    const dirtyState = dirty.getState();
    expect(dirtyState.head && dirtyState.commits[dirtyState.head]?.message).toBe('abre');

    const reverted = repo.execute('git revert HEAD');
    expect(reverted.exitCode).toBe(0);
    expect(reverted.stdout).toContain('Revert "sobe"');
    const state = repo.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.message).toContain('This reverts commit');
    expect(head?.files).toEqual({ 'cardapio.txt': 'cafe 8\n' });
    expect(head?.parents).toHaveLength(1);
    expect(repo.execute('git log --oneline').stdout).toContain('sobe');
    expect(repo.execute('git revert --abort').exitCode).toBe(128);
  });

  it('reverts a merge only with -m and can abort a conflicted revert', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'main1',
          message: 'horario',
          files: { 'cardapio.txt': 'cafe 8\n', 'horario.txt': '8h\n' },
          parents: ['base'],
        },
        {
          id: 'pro',
          message: 'aviso',
          files: { 'cardapio.txt': 'cafe 8\n', 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    });
    repo.execute('git merge promocao');
    expect(repo.execute('git revert HEAD').stderr).toContain('no -m option');
    expect(repo.execute('git revert -m 1 HEAD').exitCode).toBe(0);
    expect(repo.getState().worktree['aviso.txt']).toBeUndefined();
    expect(repo.getState().worktree['horario.txt']).toBe('8h\n');

    const conflicted = session({
      commits: [
        { message: 'um', files: { 'cardapio.txt': 'a\n' } },
        { message: 'dois', files: { 'cardapio.txt': 'b\n' } },
        { message: 'tres', files: { 'cardapio.txt': 'c\n' } },
      ],
    });
    const started = conflicted.execute('git revert HEAD~1');
    expect(started.exitCode).toBe(1);
    expect(started.stdout).toContain('CONFLICT');
    expect(conflicted.execute('git commit -m "cedo"').exitCode).not.toBe(0);
    expect(conflicted.execute('git revert --abort').exitCode).toBe(0);
    expect(conflicted.getState().merge).toBeNull();
    expect(conflicted.getState().worktree['cardapio.txt']).toBe('c\n');
    expect(conflicted.execute('git revert -m 1 HEAD').stderr).toContain('not a merge');
  });

  it('records the current branch tip when a commit is created', () => {
    const repo = session({ initialized: true });
    expect(repo.execute('git branch').stdout).toBe('');
    repo.execute('echo cafe 8 > cardapio.txt');
    repo.execute('git add cardapio.txt');
    repo.execute('git commit -m "abre"');
    const state = repo.getState();
    expect(state.branches.main).toBe(state.head);
    expect(repo.execute('git branch').stdout).toBe('* main\n');
  });
});

describe('history checks', () => {
  it('reads branch tips and whether a message is still on the first-parent line', () => {
    const repo = linear();
    repo.execute('git reset --hard HEAD~1');
    const state = repo.getState();
    const dropped = gradeGit(
      state,
      [
        { op: 'historyLacks', text: 'sobe', fail: 'o commit subiu de novo' },
        { op: 'historyIncludes', text: 'abre', fail: 'sumiu o primeiro' },
        { op: 'branchExists', name: 'main', fail: 'sem main' },
        { op: 'branchMissing', name: 'lado', fail: 'lado não devia existir' },
        { op: 'merging', value: false, fail: 'merge aberto' },
        { op: 'headParentCount', count: 0, fail: 'não é raiz' },
      ],
      repo.history(),
    );
    expect(dropped.passed).toBe(true);
  });
});
