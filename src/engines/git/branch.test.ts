import { describe, expect, it } from 'vitest';
import { gradeGit } from './grade';
import type { GitInitialState } from './repo';
import { GitSession } from './session';

const fixed = { now: () => Date.UTC(2026, 10, 18, 15, 0, 0) };

function session(initial?: GitInitialState) {
  return new GitSession(initial, fixed);
}

const diverged: GitInitialState = {
  commits: [
    { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
    {
      id: 'main1',
      message: 'reajuste',
      files: { 'cardapio.txt': 'cafe 9\n' },
      parents: ['base'],
    },
    {
      id: 'pro',
      message: 'promocao',
      files: { 'cardapio.txt': 'cafe 7\n' },
      parents: ['base'],
    },
  ],
  branches: { main: 'main1', promocao: 'pro' },
};

describe('branch, switch, checkout', () => {
  it('creates, lists, and refuses a bad or duplicate name', () => {
    const repo = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } }],
    });
    expect(repo.execute('git branch promocao').exitCode).toBe(0);
    expect(repo.execute('git branch promocao').stderr).toContain('already exists');
    expect(repo.execute('git branch HEAD~1 recuo').stderr).toContain('not a valid branch name');
    expect(repo.execute('git branch recuo HEAD~1').exitCode).toBe(128);
    expect(repo.execute('git branch recuo HEAD').exitCode).toBe(0);
    expect(repo.execute('git branch "nome ruim"').stderr).toContain('not a valid branch name');
    expect(repo.getState().branch).toBe('main');
    expect(repo.execute('git branch').stdout).toBe('* main\n  promocao\n  recuo\n');
  });

  it('lists branches in order and deletes only a merged branch', () => {
    const repo = session({
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } },
        { id: 'b', message: 'sobe', files: { 'cardapio.txt': 'cafe 9\n' }, parents: ['a'] },
      ],
      branches: { main: 'b', rascunho: 'a', promocao: 'b' },
    });
    expect(repo.execute('git branch').stdout).toBe('* main\n  promocao\n  rascunho\n');
    expect(repo.execute('git branch -d main').stderr).toContain('cannot delete');
    expect(repo.execute('git branch -d sumiu').stderr).toContain('not found');
    const removed = repo.execute('git branch -d rascunho');
    expect(removed.exitCode).toBe(0);
    expect(removed.stdout).toMatch(/^Deleted branch rascunho \(was [0-9a-f]{7}\)\.\n$/);
    expect(repo.getState().branches.rascunho).toBeUndefined();
    repo.execute('git branch lado HEAD~1');
    repo.execute('git switch lado');
    repo.execute('echo cafe 7 > cardapio.txt');
    repo.execute('git add cardapio.txt');
    repo.execute('git commit -m "lado"');
    repo.execute('git switch main');
    expect(repo.execute('git branch -d lado').stderr).toContain('not fully merged');
    expect(repo.getState().branches.lado).toBeTruthy();
    expect(repo.execute('git branch -D lado').stdout).toContain('Deleted branch lado');
    expect(repo.getState().branches.lado).toBeUndefined();
    expect(repo.execute('git branch').stdout).not.toContain('lado');
  });

  it('switches, creates with -c and -b, and carries a dirty file that both branches share', () => {
    const repo = session({
      commits: [
        {
          id: 'base',
          message: 'base',
          files: { 'cardapio.txt': 'cafe 8\n', 'nota.txt': 'fixa\n' },
        },
        {
          id: 'pro',
          message: 'promocao',
          files: { 'cardapio.txt': 'cafe 7\n', 'nota.txt': 'fixa\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'base', promocao: 'pro' },
    });
    repo.execute('echo mudou > nota.txt');
    expect(repo.execute('git switch promocao').stdout).toBe("Switched to branch 'promocao'\n");
    expect(repo.getState().worktree['nota.txt']).toBe('mudou\n');
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 7\n');
    expect(repo.execute('git switch promocao').stdout).toBe("Already on 'promocao'\n");
    expect(repo.execute('git switch nenhuma').stderr).toContain('invalid reference');
    expect(repo.execute('git switch HEAD').stderr).toContain('a branch is expected');

    repo.execute('git restore nota.txt');
    expect(repo.execute('git switch -c porcao').stdout).toBe("Switched to a new branch 'porcao'\n");
    expect(repo.getState().branch).toBe('porcao');
    expect(repo.getState().branches.porcao).toBe(repo.getState().branches.promocao);
    expect(repo.execute('git switch -c porcao').stderr).toContain('already exists');

    const other = session({
      commits: [{ message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } }],
    });
    expect(other.execute('git checkout -b ajuste HEAD').stdout).toContain(
      "Switched to a new branch 'ajuste'",
    );
    expect(other.getState().branch).toBe('ajuste');
    expect(other.execute('git checkout main').stdout).toBe("Switched to branch 'main'\n");
    expect(other.execute('git checkout -b ajuste').exitCode).not.toBe(0);
    expect(other.getState().branch).toBe('main');
  });

  it('refuses a switch that would overwrite a local or untracked file', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'pro',
          message: 'promocao',
          files: { 'cardapio.txt': 'cafe 7\n', 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'base', promocao: 'pro' },
    });
    repo.execute('echo local > cardapio.txt');
    expect(repo.execute('git checkout promocao').stderr).toContain('would be overwritten');
    expect(repo.getState().branch).toBe('main');
    repo.execute('git restore cardapio.txt');
    repo.execute('echo outra > aviso.txt');
    expect(repo.execute('git switch promocao').stderr).toContain('untracked');
    expect(repo.getState().branch).toBe('main');
  });
});

describe('merge', () => {
  it('fast-forwards when the other branch is straight ahead', () => {
    const repo = session({
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'b',
          message: 'promocao',
          files: { 'cardapio.txt': 'cafe 7\n' },
          parents: ['a'],
        },
      ],
      branches: { main: 'a', promocao: 'b' },
    });
    const merged = repo.execute('git merge promocao');
    expect(merged.exitCode).toBe(0);
    expect(merged.stdout).toContain('Fast-forward');
    expect(merged.stdout).toContain('cardapio.txt');
    const state = repo.getState();
    expect(state.head).toBe(state.branches.promocao);
    expect(state.head && state.commits[state.head]?.parents).toHaveLength(1);
    expect(state.worktree['cardapio.txt']).toBe('cafe 7\n');
    expect(repo.execute('git merge promocao').stdout).toBe('Already up to date.\n');
    expect(repo.execute('git merge').stderr).toContain('no branch specified');
    expect(repo.execute('git merge nenhuma').stderr).toContain('not something we can merge');
  });

  it('creates a merge commit when the branches touch different files', () => {
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
    const merged = repo.execute('git merge promocao');
    expect(merged.exitCode).toBe(0);
    expect(merged.stdout).toContain("Merge made by the 'ort' strategy.");
    expect(merged.stdout).toContain('create mode 100644 aviso.txt');
    const state = repo.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.parents).toHaveLength(2);
    expect(head?.message).toBe("Merge branch 'promocao'");
    expect(head?.files['horario.txt']).toBe('8h\n');
    expect(head?.files['aviso.txt']).toBe('meia\n');
    expect(state.merge).toBeNull();
    const log = repo.execute('git log --oneline').stdout;
    expect(log).toContain('aviso da casa');
    expect(log).toContain('horario');
    const result = gradeGit(
      state,
      [
        { op: 'headParentCount', count: 2, fail: 'não é merge' },
        { op: 'reachableIncludes', text: 'aviso da casa', fail: 'o lado sumiu' },
        { op: 'branchTipMessage', name: 'promocao', text: 'aviso', fail: 'ponta' },
        {
          op: 'branchTipFile',
          name: 'main',
          path: 'aviso.txt',
          content: 'meia\n',
          fail: 'arquivo',
        },
      ],
      repo.history(),
    );
    expect(result.passed).toBe(true);
  });

  it('merges different lines of one file without a conflict', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'a\nb\nc\n' } },
        {
          id: 'main1',
          message: 'nossa',
          files: { 'cardapio.txt': 'a\nB\nc\n' },
          parents: ['base'],
        },
        { id: 'pro', message: 'deles', files: { 'cardapio.txt': 'a\nb\nC\n' }, parents: ['base'] },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    });
    expect(repo.execute('git merge promocao').exitCode).toBe(0);
    expect(repo.getState().worktree['cardapio.txt']).toBe('a\nB\nC\n');
    expect(repo.execute('git status').stdout).toContain('working tree clean');
  });

  it('stops on a conflict, commits the resolution, and can abort instead', () => {
    const repo = session(diverged);
    const conflict = repo.execute('git merge promocao');
    expect(conflict.exitCode).toBe(1);
    expect(conflict.stdout).toContain('Auto-merging cardapio.txt');
    expect(conflict.stdout).toContain('CONFLICT (content): Merge conflict in cardapio.txt');
    expect(conflict.stdout).toContain('Automatic merge failed');
    expect(repo.getState().worktree['cardapio.txt']).toContain('<<<<<<< HEAD');
    expect(repo.execute('git commit -m "cedo"').stderr).toContain('unmerged files');
    expect(repo.execute('git switch main').exitCode).not.toBe(0);
    const status = repo.execute('git status').stdout;
    expect(status).toContain('You have unmerged paths.');
    expect(status).toContain('both modified:');
    expect(status).toContain('cardapio.txt');

    repo.execute('echo "cafe 9\ncafe 7" > cardapio.txt');
    repo.execute('git add cardapio.txt');
    expect(repo.execute('git status').stdout).toContain(
      'All conflicts fixed but you are still merging.',
    );
    const committed = repo.execute('git commit');
    expect(committed.exitCode).toBe(0);
    expect(committed.stdout).toContain("Merge branch 'promocao'");
    const state = repo.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.parents).toHaveLength(2);
    expect(head?.files['cardapio.txt']).toBe('cafe 9\ncafe 7\n');
    expect(state.merge).toBeNull();
    expect(state.worktree['cardapio.txt']).toBe('cafe 9\ncafe 7\n');

    const aborted = session(diverged);
    aborted.execute('git merge promocao');
    aborted.execute('echo rascunho > nota.txt');
    expect(aborted.execute('git merge --abort').exitCode).toBe(0);
    expect(aborted.getState().merge).toBeNull();
    expect(aborted.getState().worktree['cardapio.txt']).toBe('cafe 9\n');
    expect(aborted.getState().worktree['nota.txt']).toBe('rascunho\n');
    const abortedState = aborted.getState();
    expect(abortedState.head && abortedState.commits[abortedState.head]?.message).toBe('reajuste');
    expect(aborted.execute('git merge --abort').exitCode).toBe(128);
  });

  it('reports a modify/delete conflict and an unrelated history', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'main1',
          message: 'reajuste',
          files: { 'cardapio.txt': 'cafe 9\n' },
          parents: ['base'],
        },
        { id: 'pro', message: 'apaga', files: {}, parents: ['base'] },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    });
    const conflict = repo.execute('git merge promocao');
    expect(conflict.stdout).toContain('CONFLICT (modify/delete)');
    expect(repo.getState().worktree['cardapio.txt']).toBe('cafe 9\n');
    expect(repo.execute('git status').stdout).toContain('deleted by them:');
    repo.execute('rm cardapio.txt');
    repo.execute('git add cardapio.txt');
    expect(repo.execute('git commit -m "fica sem o arquivo"').exitCode).toBe(0);
    const cleared = repo.getState();
    expect(cleared.head ? cleared.commits[cleared.head]?.files : undefined).toEqual({});

    const alien = session({
      commits: [
        { id: 'a', message: 'a', files: { 'a.txt': 'a\n' }, parents: [] },
        { id: 'b', message: 'b', files: { 'b.txt': 'b\n' }, parents: [] },
      ],
      branches: { main: 'a', outra: 'b' },
    });
    expect(alien.execute('git merge outra').stderr).toContain('unrelated histories');
    expect(alien.getState().merge).toBeNull();
  });

  it('refuses a merge that would overwrite a local edit and keeps an untracked file on fast-forward', () => {
    const repo = session(diverged);
    repo.execute('echo local > cardapio.txt');
    expect(repo.execute('git merge promocao').stderr).toContain('would be overwritten');
    expect(repo.getState().merge).toBeNull();

    const ahead = session({
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': 'cafe 8\n' } },
        { id: 'b', message: 'promocao', files: { 'cardapio.txt': 'cafe 7\n' }, parents: ['a'] },
      ],
      branches: { main: 'a', promocao: 'b' },
    });
    ahead.execute('echo solto > nota.txt');
    expect(ahead.execute('git merge promocao').exitCode).toBe(0);
    expect(ahead.getState().worktree['nota.txt']).toBe('solto\n');
    expect(ahead.getState().worktree['cardapio.txt']).toBe('cafe 7\n');
  });

  it('marks an add/add conflict and lets merge --continue finish it', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'nota.txt': 'ok\n' } },
        {
          id: 'main1',
          message: 'nossa',
          files: { 'nota.txt': 'ok\n', 'extra.txt': 'a\n' },
          parents: ['base'],
        },
        {
          id: 'pro',
          message: 'deles',
          files: { 'nota.txt': 'ok\n', 'extra.txt': 'b\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    });
    const conflict = repo.execute('git merge promocao');
    expect(conflict.stdout).toContain('CONFLICT (add/add)');
    expect(repo.getState().worktree['extra.txt']).toContain('<<<<<<< HEAD');
    repo.execute('echo c > extra.txt');
    repo.execute('git add extra.txt');
    const continued = repo.execute('git merge --continue');
    expect(continued.exitCode).toBe(0);
    expect(continued.stdout).toContain("Merge branch 'promocao'");
    const state = repo.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.parents).toHaveLength(2);
    expect(head?.files['extra.txt']).toBe('c\n');
    expect(state.merge).toBeNull();
  });

  it('does not create the new branch when checkout -b cannot switch', () => {
    const repo = session({
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': 'cafe 8\n' } },
        {
          id: 'pro',
          message: 'promocao',
          files: { 'cardapio.txt': 'cafe 7\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'base', promocao: 'pro' },
    });
    repo.execute('echo local > cardapio.txt');
    expect(repo.execute('git checkout -b copia promocao').exitCode).not.toBe(0);
    expect(repo.getState().branches.copia).toBeUndefined();
    expect(repo.getState().branch).toBe('main');
  });
});
