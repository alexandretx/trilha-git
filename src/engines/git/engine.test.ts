import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gradeGit } from './grade';
import { sha1Hex } from './hash';
import { hashBlob, hashCommit, hashTree, AUTHOR, TIMEZONE } from './objects';
import { parseCommandLine } from './parse';
import { GitSession } from './session';

const fixed = { now: () => Date.UTC(2026, 10, 18, 15, 0, 0) };

function session(initial?: ConstructorParameters<typeof GitSession>[0]) {
  return new GitSession(initial, fixed);
}

describe('sha1 and git objects', () => {
  it('matches node crypto and the empty Git tree', () => {
    for (const sample of ['', 'abc', 'hello\n', 'áção']) {
      const bytes = new TextEncoder().encode(sample);
      expect(sha1Hex(bytes)).toBe(createHash('sha1').update(bytes).digest('hex'));
    }
    expect(hashTree({}).oid).toBe('4b825dc642cb6eb9a060e54bf8d69288fbee4904');
  });

  it('hashes a blob the way git hash-object does', () => {
    const content = 'ideia inicial\n';
    const oid = hashBlob(content).oid;
    const raw = Buffer.concat([
      Buffer.from(`blob ${Buffer.byteLength(content)}\0`),
      Buffer.from(content),
    ]);
    expect(oid).toBe(createHash('sha1').update(raw).digest('hex'));
  });

  it('puts the author, parent, and timezone into the commit object', () => {
    const tree = hashTree({ 'notas.txt': 'ideia inicial\n' }).oid;
    const oid = hashCommit({
      tree,
      parents: [],
      author: AUTHOR,
      timestamp: 1_763_467_200,
      message: 'adiciona notas',
    }).oid;
    const text =
      `tree ${tree}\n` +
      `author ${AUTHOR} 1763467200 ${TIMEZONE}\n` +
      `committer ${AUTHOR} 1763467200 ${TIMEZONE}\n` +
      `\n` +
      `adiciona notas\n`;
    const raw = Buffer.concat([
      Buffer.from(`commit ${Buffer.byteLength(text)}\0`),
      Buffer.from(text),
    ]);
    expect(oid).toBe(createHash('sha1').update(raw).digest('hex'));
  });
});

describe('parser', () => {
  it('keeps quotes, redirects, and chains', () => {
    const parsed = parseCommandLine('echo "ideia inicial" > notas.txt && git add .');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.commands[0]).toMatchObject({
      argv: ['echo', 'ideia inicial'],
      redirect: { append: false, target: 'notas.txt' },
      follow: 'and',
    });
    expect(parsed.commands[1]?.argv).toEqual(['git', 'add', '.']);
  });

  it('rejects an open quote, a pipe, and a dangling &&', () => {
    expect(parseCommandLine('echo "aberta').ok).toBe(false);
    expect(parseCommandLine('ls | cat').ok).toBe(false);
    expect(parseCommandLine('echo a &&').ok).toBe(false);
  });

  it('treats a hash at the start of a word as a comment', () => {
    const parsed = parseCommandLine('echo a#b # some note');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.commands[0]?.argv).toEqual(['echo', 'a#b']);
  });
});

describe('git session', () => {
  it('refuses git before init and explains an unknown command in Portuguese', () => {
    const repo = session();
    const status = repo.execute('git status');
    expect(status.exitCode).toBe(128);
    expect(status.stderr).toContain('not a git repository');
    const unknown = repo.execute('foo');
    expect(unknown.exitCode).toBe(127);
    expect(unknown.stderr).toContain('Não conheço o comando "foo"');
    expect(repo.execute('echo oi > notas.txt').exitCode).toBe(0);
    expect(repo.getState().worktree['notas.txt']).toBe('oi\n');
  });

  it('inits, reports an untracked file, and accepts add . or a named path', () => {
    const repo = session();
    expect(repo.execute('git init').stdout).toBe(
      'Initialized empty Git repository in /repo/.git/\n',
    );
    expect(repo.execute('git init').stdout).toContain('Reinitialized');
    repo.execute('echo ideia inicial > notas.txt');
    const status = repo.execute('git status');
    expect(status.stdout).toBe(
      [
        'On branch main',
        '',
        'No commits yet',
        '',
        'Untracked files:',
        '  (use "git add <file>..." to include in what will be committed)',
        '\tnotas.txt',
        '',
        'nothing added to commit but untracked files present (use "git add" to track)',
        '',
      ].join('\n'),
    );

    const named = session({ initialized: true, worktree: { 'notas.txt': 'ideia inicial\n' } });
    named.execute('git add notas.txt');
    expect(named.getState().index['notas.txt']).toBe('ideia inicial\n');

    const dotted = session({ initialized: true, worktree: { 'notas.txt': 'ideia inicial\n' } });
    dotted.execute('git add .');
    expect(dotted.getState().index).toEqual({ 'notas.txt': 'ideia inicial\n' });
  });

  it('commits the index, prints a root commit, and logs it in English', () => {
    const repo = session({
      initialized: true,
      worktree: { 'notas.txt': 'ideia inicial\n' },
      index: { 'notas.txt': 'ideia inicial\n' },
    });
    expect(repo.execute('git commit').stderr).toContain('falta a mensagem');
    const committed = repo.execute('git commit -m "adiciona notas"');
    expect(committed.exitCode).toBe(0);
    expect(committed.stdout).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] adiciona notas\n/);
    expect(committed.stdout).toContain('1 file changed, 1 insertion(+)');
    expect(committed.stdout).toContain('create mode 100644 notas.txt');

    const again = repo.execute('git commit -m "de novo"');
    expect(again.exitCode).toBe(1);
    expect(again.stderr).toContain('nothing to commit, working tree clean');

    const log = repo.execute('git log');
    expect(log.stdout).toContain('Author: Estudante <estudante@trilha.local>');
    expect(log.stdout).toContain('Date:   Wed Nov 18 12:00:00 2026 -0300');
    expect(log.stdout).toContain('    adiciona notas');
    const oneline = repo.execute('git log --oneline');
    expect(oneline.stdout.trim()).toMatch(/^[0-9a-f]{7} adiciona notas$/);
    expect(repo.execute('git log --nope').exitCode).toBe(1);
  });

  it('does not commit a dirty worktree until add, unless -a is used on a tracked file', () => {
    const repo = session({
      commits: [{ message: 'adiciona notas', files: { 'notas.txt': 'ideia inicial\n' } }],
    });
    repo.execute('echo mudou > notas.txt');
    const refused = repo.execute('git commit -m "cedo"');
    expect(refused.stderr).toContain('no changes added to commit');
    expect(
      repo.getState().head && repo.getState().commits[repo.getState().head ?? '']?.message,
    ).toBe('adiciona notas');

    const amended = session({
      commits: [{ message: 'adiciona notas', files: { 'notas.txt': 'ideia inicial\n' } }],
    });
    amended.execute('echo mudou > notas.txt');
    const committed = amended.execute('git commit -am "atualiza notas"');
    expect(committed.exitCode).toBe(0);
    const state = amended.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.message).toBe('atualiza notas');
    expect(head?.files['notas.txt']).toBe('mudou\n');
    expect(head?.parents).toHaveLength(1);
  });

  it('shows staged and unstaged changes, and stages a deletion with git add', () => {
    const repo = session({
      commits: [{ message: 'base', files: { 'notas.txt': 'v1\n' } }],
    });
    repo.execute('echo v2 > notas.txt');
    repo.execute('git add notas.txt');
    repo.execute('echo v3 > notas.txt');
    const status = repo.execute('git status').stdout;
    expect(status).toContain('Changes to be committed:');
    expect(status).toContain('\tmodified:   notas.txt');
    expect(status).toContain('Changes not staged for commit:');

    repo.execute('rm notas.txt');
    repo.execute('git add notas.txt');
    const head = repo.getState().head;
    expect(repo.getState().index['notas.txt']).toBeUndefined();
    expect(head && repo.getState().commits[head]?.files['notas.txt']).toBe('v1\n');
    const removed = repo.execute('git commit -m "remove notas"');
    expect(removed.stdout).toContain('delete mode 100644 notas.txt');
    expect(
      repo.getState().head && repo.getState().commits[repo.getState().head ?? '']?.files,
    ).toEqual({});
  });

  it('keeps files inside the repository and supports the small shell', () => {
    const repo = session({ initialized: true });
    expect(repo.execute('echo segredo > ../segredo').exitCode).toBe(1);
    expect(repo.execute('cat /etc/passwd').stderr).toContain('fora do repositório');
    expect(repo.execute('mkdir src').exitCode).toBe(0);
    expect(repo.execute('echo ola > src/app.txt').exitCode).toBe(0);
    expect(repo.execute('mkdir src').stderr).toContain('já existe');
    expect(repo.execute('ls').stdout).toBe('src\n');
    expect(repo.execute('ls src').stdout).toBe('app.txt\n');
    expect(repo.execute('cat src/app.txt').stdout).toBe('ola\n');
    repo.execute('echo mais >> src/app.txt');
    expect(repo.getState().worktree['src/app.txt']).toBe('ola\nmais\n');
    expect(repo.execute('pwd').stdout).toBe('/repo\n');
    expect(repo.execute('touch vazio.txt').exitCode).toBe(0);
    expect(repo.getState().worktree['vazio.txt']).toBe('');
    expect(repo.execute('cat sumiu').exitCode).toBe(1);
  });

  it('stops a && chain after a failure and still runs commands after ;', () => {
    const repo = session();
    const chained = repo.execute('git status && echo nao');
    expect(chained.stdout).not.toContain('nao');
    expect(repo.history().some((argv) => argv[0] === 'echo')).toBe(false);

    const sequenced = repo.execute('git status ; echo sim');
    expect(sequenced.stdout).toContain('sim');
    expect(repo.getState().initialized).toBe(false);
  });

  it('rejects a pathspec that does not exist and a commit with no message', () => {
    const repo = session({ initialized: true });
    expect(repo.execute('git add sumiu.txt').stderr).toContain("pathspec 'sumiu.txt'");
    expect(repo.execute('git add').exitCode).toBe(128);
    expect(repo.execute('git log').stderr).toContain('does not have any commits yet');
    repo.execute('echo a > a.txt');
    repo.execute('git add a.txt');
    expect(repo.execute('git commit -m "   "').stderr).toContain('vazia');
  });

  it('builds a nested tree id from the files that were committed', () => {
    const repo = session({ initialized: true });
    repo.execute('mkdir src && echo um > src/a.txt && git add src && git commit -m "src"');
    const state = repo.getState();
    const head = state.head ? state.commits[state.head] : undefined;
    expect(head?.tree).toBe(hashTree({ 'src/a.txt': 'um\n' }).oid);
    expect(head?.files).toEqual({ 'src/a.txt': 'um\n' });
  });
});

describe('grader', () => {
  it('accepts any command sequence that lands on the required state', () => {
    const repo = session({ initialized: true, worktree: { 'notas.txt': 'ideia inicial\n' } });
    repo.execute('git add .');
    repo.execute('git commit -m "minhas notas"');
    const result = gradeGit(
      repo.getState(),
      [
        { op: 'commitCount', count: 1, fail: 'faltou o commit' },
        { op: 'headMessageIncludes', text: 'NOTAS', fail: 'mensagem' },
        { op: 'headFile', path: 'notas.txt', content: 'ideia inicial\n', fail: 'arquivo' },
        { op: 'clean', fail: 'sujo' },
      ],
      repo.history(),
    );
    expect(result.passed).toBe(true);
  });

  it('counts any git status line as the status family', () => {
    const repo = session({ initialized: true });
    const missed = gradeGit(
      repo.getState(),
      [{ op: 'ran', prefix: ['git', 'status'], fail: 'use git status' }],
      repo.history(),
    );
    expect(missed.failures).toEqual(['use git status']);

    repo.execute('git status -u');
    const seen = gradeGit(
      repo.getState(),
      [{ op: 'ran', prefix: ['git', 'status'], fail: 'use git status' }],
      repo.history(),
    );
    expect(seen.passed).toBe(true);
  });
});
