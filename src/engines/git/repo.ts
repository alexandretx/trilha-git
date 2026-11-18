import type { Clock } from '../../core/types';
import { AUTHOR, formatGitDate, hashCommit, hashTree } from './objects';
import { isInside } from './paths';

export const systemClock: Clock = { now: () => Date.now() };

export interface CommitData {
  oid: string;
  tree: string;
  parents: string[];
  message: string;
  author: string;
  timestamp: number;
  files: Record<string, string>;
}

export interface RepoState {
  initialized: boolean;
  branch: string;
  head: string | null;
  commits: Record<string, CommitData>;
  index: Record<string, string>;
  worktree: Record<string, string>;
  dirs: string[];
}

export interface GitInitialState {
  initialized?: boolean;
  commits?: { message: string; files: Record<string, string>; timestamp?: number }[];
  worktree?: Record<string, string>;
  index?: Record<string, string>;
  dirs?: string[];
}

export function emptyRepo(): RepoState {
  return {
    initialized: false,
    branch: 'main',
    head: null,
    commits: {},
    index: {},
    worktree: {},
    dirs: [],
  };
}

export function headFiles(state: RepoState): Record<string, string> {
  if (!state.head) return {};
  return state.commits[state.head]?.files ?? {};
}

export function recordsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

export function history(state: RepoState): CommitData[] {
  const list: CommitData[] = [];
  const seen = new Set<string>();
  let oid = state.head;
  while (oid && !seen.has(oid)) {
    seen.add(oid);
    const commit = state.commits[oid];
    if (!commit) break;
    list.push(commit);
    oid = commit.parents[0] ?? null;
  }
  return list;
}

function impliedDirs(state: RepoState): string[] {
  const dirs = new Set(state.dirs);
  for (const path of [...Object.keys(state.worktree), ...Object.keys(state.index)]) {
    const segments = path.split('/');
    let prefix = '';
    for (let index = 0; index < segments.length - 1; index += 1) {
      prefix = prefix ? `${prefix}/${segments[index]}` : (segments[index] ?? '');
      if (prefix) dirs.add(prefix);
    }
  }
  return [...dirs].sort();
}

export function withDirs(state: RepoState): RepoState {
  return { ...state, dirs: impliedDirs(state) };
}

export function commitIndex(
  state: RepoState,
  message: string,
  timestamp: number,
): { state: RepoState; summary: string } {
  const files = { ...state.index };
  const tree = hashTree(files).oid;
  const parents = state.head ? [state.head] : [];
  const oid = hashCommit({
    tree,
    parents,
    author: AUTHOR,
    timestamp,
    message,
  }).oid;
  const commit: CommitData = {
    oid,
    tree,
    parents,
    message,
    author: AUTHOR,
    timestamp,
    files,
  };
  const next = withDirs({
    ...state,
    head: oid,
    commits: { ...state.commits, [oid]: commit },
    index: files,
  });
  return { state: next, summary: formatCommit(state, next, commit) };
}

function lineCount(content: string): number {
  if (content === '') return 0;
  const parts = content.split('\n');
  if (content.endsWith('\n')) parts.pop();
  return parts.length;
}

function lines(content: string): string[] {
  if (content === '') return [];
  const parts = content.split('\n');
  if (content.endsWith('\n')) parts.pop();
  return parts;
}

function lineChanges(before: string, after: string): { insertions: number; deletions: number } {
  const source = lines(before);
  const target = lines(after);
  const scores: number[][] = Array.from({ length: source.length + 1 }, () =>
    Array<number>(target.length + 1).fill(0),
  );
  for (let row = source.length - 1; row >= 0; row -= 1) {
    for (let column = target.length - 1; column >= 0; column -= 1) {
      const current = scores[row];
      const below = scores[row + 1];
      if (!current || !below) continue;
      current[column] =
        source[row] === target[column]
          ? (below[column + 1] ?? 0) + 1
          : Math.max(below[column] ?? 0, current[column + 1] ?? 0);
    }
  }
  const common = scores[0]?.[0] ?? 0;
  return { deletions: source.length - common, insertions: target.length - common };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function formatCommit(before: RepoState, after: RepoState, commit: CommitData): string {
  const previous = before.head ? (before.commits[before.head]?.files ?? {}) : {};
  const paths = [...new Set([...Object.keys(previous), ...Object.keys(commit.files)])].sort();
  let insertions = 0;
  let deletions = 0;
  const notes: string[] = [];
  for (const path of paths) {
    const oldContent = previous[path];
    const newContent = commit.files[path];
    if (oldContent === undefined && newContent !== undefined) {
      insertions += lineCount(newContent);
      notes.push(` create mode 100644 ${path}`);
    } else if (oldContent !== undefined && newContent === undefined) {
      deletions += lineCount(oldContent);
      notes.push(` delete mode 100644 ${path}`);
    } else if (oldContent !== undefined && newContent !== undefined && oldContent !== newContent) {
      const change = lineChanges(oldContent, newContent);
      insertions += change.insertions;
      deletions += change.deletions;
    }
  }

  const fileCount = paths.filter((path) => previous[path] !== commit.files[path]).length;
  const stats = [plural(fileCount, 'file changed', 'files changed')];
  if (insertions > 0 && deletions > 0) {
    stats.push(plural(insertions, 'insertion(+)', 'insertions(+)'));
    stats.push(plural(deletions, 'deletion(-)', 'deletions(-)'));
  } else if (deletions > 0) {
    stats.push(plural(deletions, 'deletion(-)', 'deletions(-)'));
  } else if (insertions > 0) {
    stats.push(plural(insertions, 'insertion(+)', 'insertions(+)'));
  } else {
    stats.push('0 insertions(+)', '0 deletions(-)');
  }

  const subject = commit.message.split('\n')[0] ?? '';
  const short = commit.oid.slice(0, 7);
  const root = commit.parents.length === 0 ? ' (root-commit)' : '';
  const header = `[${after.branch}${root} ${short}] ${subject}`;
  return [header, ` ${stats.join(', ')}`, ...notes].join('\n');
}

type ChangeKind = 'new file' | 'modified' | 'deleted';

function padLabel(kind: ChangeKind): string {
  return `${kind}:`.padEnd(12, ' ');
}

function entry(kind: ChangeKind, path: string): string {
  return `\t${padLabel(kind)}${path}`;
}

export function formatStatus(state: RepoState): string {
  const head = headFiles(state);
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  const paths = [
    ...new Set([...Object.keys(head), ...Object.keys(state.index), ...Object.keys(state.worktree)]),
  ].sort();

  for (const path of paths) {
    const headContent = head[path];
    const indexContent = state.index[path];
    const workContent = state.worktree[path];
    if (indexContent !== undefined && headContent === undefined)
      staged.push(entry('new file', path));
    else if (indexContent === undefined && headContent !== undefined)
      staged.push(entry('deleted', path));
    else if (
      indexContent !== undefined &&
      headContent !== undefined &&
      indexContent !== headContent
    ) {
      staged.push(entry('modified', path));
    }

    if (indexContent !== undefined && workContent === undefined)
      unstaged.push(entry('deleted', path));
    else if (
      indexContent !== undefined &&
      workContent !== undefined &&
      indexContent !== workContent
    ) {
      unstaged.push(entry('modified', path));
    } else if (indexContent === undefined && workContent !== undefined) {
      untracked.push(`\t${path}`);
    }
  }

  const lines = [`On branch ${state.branch}`];
  if (!state.head) {
    lines.push('', 'No commits yet', '');
  }

  if (staged.length > 0) {
    lines.push('Changes to be committed:');
    const hint = state.head
      ? '  (use "git restore --staged <file>..." to unstage)'
      : '  (use "git rm --cached <file>..." to unstage)';
    lines.push(hint, ...staged, '');
  }

  if (unstaged.length > 0) {
    lines.push(
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      ...unstaged,
      '',
    );
  }

  if (untracked.length > 0) {
    lines.push(
      'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)',
      ...untracked,
      '',
    );
  }

  if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
    if (!state.head) lines.push('');
    lines.push('nothing to commit, working tree clean');
  } else if (staged.length === 0 && untracked.length > 0 && unstaged.length === 0) {
    lines.push('nothing added to commit but untracked files present (use "git add" to track)');
  } else if (staged.length === 0) {
    lines.push('no changes added to commit (use "git add" and/or "git commit -a")');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function formatLog(
  state: RepoState,
  options: { oneline: boolean; limit: number | null },
): string {
  let commits = history(state);
  if (options.limit !== null) commits = commits.slice(0, options.limit);
  if (options.oneline) {
    return commits
      .map((commit) => `${commit.oid.slice(0, 7)} ${commit.message.split('\n')[0] ?? ''}`)
      .join('\n');
  }
  return commits
    .map((commit) => {
      const body = commit.message
        .replace(/\n$/, '')
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      return [
        `commit ${commit.oid}`,
        `Author: ${commit.author}`,
        `Date:   ${formatGitDate(commit.timestamp)}`,
        '',
        body,
      ].join('\n');
    })
    .join('\n\n');
}

export function stagePath(state: RepoState, path: string): RepoState | 'missing' {
  if (path === '.') return stageAll(state);
  const asDir =
    state.dirs.includes(path) ||
    Object.keys(state.worktree).some((file) => isInside(file, path) && file !== path) ||
    Object.keys(state.index).some((file) => isInside(file, path) && file !== path);
  if (asDir) {
    const index = { ...state.index };
    for (const file of Object.keys(index)) {
      if (isInside(file, path) && !(file in state.worktree)) delete index[file];
    }
    for (const [file, content] of Object.entries(state.worktree)) {
      if (isInside(file, path)) index[file] = content;
    }
    return { ...state, index };
  }
  if (path in state.worktree) {
    return { ...state, index: { ...state.index, [path]: state.worktree[path] ?? '' } };
  }
  if (path in state.index || path in headFiles(state)) {
    const index = { ...state.index };
    delete index[path];
    return { ...state, index };
  }
  return 'missing';
}

function stageAll(state: RepoState): RepoState {
  const index: Record<string, string> = {};
  for (const [path, content] of Object.entries(state.worktree)) index[path] = content;
  return { ...state, index };
}

export function createRepo(initial: GitInitialState = {}, clock: Clock = systemClock): RepoState {
  let state = emptyRepo();
  if (initial.initialized || (initial.commits?.length ?? 0) > 0) {
    state = { ...state, initialized: true };
  }
  const commits = initial.commits ?? [];
  const base = Math.floor(clock.now() / 1000) - commits.length * 60;
  commits.forEach((commit, index) => {
    state = {
      ...state,
      initialized: true,
      worktree: { ...commit.files },
      index: { ...commit.files },
    };
    state = commitIndex(state, commit.message, commit.timestamp ?? base + index * 60).state;
  });
  if (initial.worktree) state = { ...state, worktree: { ...initial.worktree } };
  if (initial.index) state = { ...state, index: { ...initial.index } };
  if (initial.dirs) state = { ...state, dirs: [...state.dirs, ...initial.dirs] };
  return withDirs(state);
}
