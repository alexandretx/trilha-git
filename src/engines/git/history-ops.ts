import type { Clock } from '../../core/types';
import { splitArgs } from './args';
import { performCommit } from './commit';
import { formatDiffStat, formatTreeDiff, mergeTrees, selectPaths, type TreeMerge } from './diff';
import { formatGitDate } from './objects';
import { isInside, normalizePath } from './paths';
import {
  commitIndex,
  headFiles,
  recordsEqual,
  withDirs,
  type CommitData,
  type RepoState,
} from './repo';
import { commandFailure, commandOutput, type CommandResult } from './result';
import { looksLikeRevision, resolveRevision, shortOid } from './revisions';
import { abortPending, checkoutTree, resetHardTree, snapshotUntracked } from './worktree';

export function runDiff(state: RepoState, args: string[]): CommandResult {
  const { flags, rest } = splitArgs(args);
  let staged = false;
  for (const flag of flags) {
    if (flag === '--staged' || flag === '--cached') staged = true;
    else return commandFailure(state, `error: unknown option '${flag}'`);
  }

  const specs: string[] = [];
  for (const arg of rest) {
    if (arg === '.') {
      specs.push('.');
      continue;
    }
    const path = normalizePath(arg);
    if (!path) return commandFailure(state, `caminho fora do repositório: ${arg}`);
    const known =
      path in state.worktree ||
      path in state.index ||
      path in headFiles(state) ||
      state.dirs.includes(path);
    if (!known && looksLikeRevision(state, arg)) {
      return commandFailure(
        state,
        'git diff com revisão ainda não entra nesta trilha. Use git diff ou git diff --staged.',
      );
    }
    specs.push(path);
  }

  const head = headFiles(state);
  const before = staged ? head : state.index;
  const after = staged ? state.index : state.worktree;
  const paths = selectPaths(before, after, specs).filter((path) => staged || path in state.index);
  return { state, output: commandOutput(formatTreeDiff(before, after, paths)) };
}

export function runShow(state: RepoState, args: string[]): CommandResult {
  const { flags, rest } = splitArgs(args);
  const flag = flags[0];
  if (flag) return commandFailure(state, `error: unknown option '${flag}'`);
  if (rest.length > 1) return commandFailure(state, 'git show aceita uma revisão nesta trilha.');
  const resolved = resolveRevision(state, rest[0] ?? 'HEAD');
  if ('error' in resolved) return commandFailure(state, resolved.error, 128);
  const commit = state.commits[resolved.oid];
  if (!commit) return commandFailure(state, 'fatal: bad object', 128);
  return { state, output: commandOutput(formatShow(state, commit)) };
}

function formatShow(state: RepoState, commit: CommitData): string {
  const lines = [`commit ${commit.oid}`];
  if (commit.parents.length > 1) {
    lines.push(`Merge: ${commit.parents.map((parent) => shortOid(state, parent)).join(' ')}`);
  }
  lines.push(`Author: ${commit.author}`, `Date:   ${formatGitDate(commit.timestamp)}`, '');
  const body = commit.message
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  lines.push(body);
  const parentOid = commit.parents[0];
  const parentFiles = parentOid ? (state.commits[parentOid]?.files ?? {}) : {};
  let paths = selectPaths(parentFiles, commit.files, []);
  if (commit.parents.length > 1) {
    paths = paths.filter((path) =>
      commit.parents.every((parent) => {
        const files = state.commits[parent]?.files ?? {};
        return files[path] !== commit.files[path];
      }),
    );
  }
  const diff = formatTreeDiff(parentFiles, commit.files, paths);
  if (!diff) return `${lines.join('\n')}\n`;
  return `${lines.join('\n')}\n\n${diff}`;
}

export function runRestore(state: RepoState, args: string[]): CommandResult {
  const { flags, rest } = splitArgs(args);
  let staged = false;
  let worktree = false;
  for (const flag of flags) {
    if (flag === '--staged' || flag === '--cached') staged = true;
    else if (flag === '--worktree') worktree = true;
    else return commandFailure(state, `error: unknown option '${flag}'`);
  }
  if (!staged && !worktree) worktree = true;
  if (rest.length === 0) {
    return commandFailure(state, 'fatal: you must specify path(s) to restore', 128);
  }

  let next = state;
  for (const arg of rest) {
    const spec = arg === '.' ? '.' : normalizePath(arg);
    if (!spec) return commandFailure(next, `caminho fora do repositório: ${arg}`);
    const restored = restoreSpec(next, spec, staged, worktree);
    if ('error' in restored) return commandFailure(next, restored.error);
    next = restored;
  }
  return { state: withDirs(next), output: commandOutput() };
}

export function runReset(state: RepoState, args: string[]): CommandResult {
  const { flags, rest } = splitArgs(args);
  let mode: 'soft' | 'mixed' | 'hard' | null = null;
  for (const flag of flags) {
    if (flag === '--soft' || flag === '--mixed' || flag === '--hard') {
      const nextMode = flag.slice(2) as 'soft' | 'mixed' | 'hard';
      if (mode && mode !== nextMode) {
        return commandFailure(state, `error: ${flag} não combina com --${mode}.`);
      }
      mode = nextMode;
    } else return commandFailure(state, `error: unknown option '${flag}'`);
  }
  const selected = mode ?? 'mixed';
  if (rest.length > 1) {
    return commandFailure(
      state,
      'git reset com caminho ainda não entra nesta trilha. Use git restore --staged.',
    );
  }
  const revision = rest[0] ?? 'HEAD';
  const resolved = resolveRevision(state, revision);
  if ('error' in resolved) return commandFailure(state, resolved.error, 128);
  const target = state.commits[resolved.oid];
  if (!target) return commandFailure(state, 'fatal: bad object', 128);

  const moved: RepoState = {
    ...state,
    head: resolved.oid,
    branches: { ...state.branches, [state.branch]: resolved.oid },
    merge: null,
  };
  if (selected === 'soft') return { state: moved, output: commandOutput() };
  if (selected === 'mixed') {
    const next = withDirs({ ...moved, index: { ...target.files } });
    return { state: next, output: commandOutput(mixedNote(target.files, next.worktree)) };
  }
  const placed = resetHardTree(state, target.files, revision);
  if ('error' in placed) return commandFailure(state, placed.error);
  const next = withDirs({ ...moved, index: placed.index, worktree: placed.worktree });
  const subject = target.message.split('\n')[0] ?? '';
  return {
    state: next,
    output: commandOutput(`HEAD is now at ${shortOid(next, resolved.oid)} ${subject}\n`),
  };
}

export function runRevert(state: RepoState, args: string[], clock: Clock): CommandResult {
  const parsed = parseRevertArgs(args);
  if ('error' in parsed) return commandFailure(state, parsed.error, parsed.code ?? 1);
  if (parsed.abort) return abortKind(state, 'revert');
  if (parsed.continue) {
    if (state.merge?.kind !== 'revert') {
      return commandFailure(state, 'fatal: no revert in progress', 128);
    }
    return performCommit(state, [], clock);
  }
  if (state.merge) return operationInProgress(state);
  if (!parsed.commit) return commandFailure(state, 'fatal: revert requires a commit', 128);

  const resolved = resolveRevision(state, parsed.commit);
  if ('error' in resolved) return commandFailure(state, resolved.error, 128);
  const commit = state.commits[resolved.oid];
  if (!commit || !state.head) return commandFailure(state, 'fatal: bad object', 128);

  if (commit.parents.length > 1 && parsed.mainline === null) {
    return commandFailure(
      state,
      `error: commit ${shortOid(state, commit.oid)} is a merge but no -m option was given.\nfatal: revert failed`,
      128,
    );
  }
  if (parsed.mainline !== null && commit.parents.length < 2) {
    return commandFailure(
      state,
      'error: mainline was specified but commit is not a merge.\nfatal: revert failed',
      128,
    );
  }
  if (
    parsed.mainline !== null &&
    (parsed.mainline < 1 || parsed.mainline > commit.parents.length)
  ) {
    return commandFailure(
      state,
      `error: commit ${shortOid(state, commit.oid)} does not have parent ${parsed.mainline}\nfatal: revert failed`,
      128,
    );
  }

  const dirty = dirtyTracked(state);
  if (dirty.length > 0) {
    return commandFailure(
      state,
      [
        'error: Your local changes to the following files would be overwritten by merge:',
        ...dirty.map((path) => `\t${path}`),
        'Please commit your changes or stash them before you merge.',
        'Aborting',
        'fatal: revert failed',
      ].join('\n'),
      128,
    );
  }

  const parentOid =
    parsed.mainline !== null ? commit.parents[parsed.mainline - 1] : commit.parents[0];
  const parentFiles = parentOid ? (state.commits[parentOid]?.files ?? {}) : {};
  const ours = headFiles(state);
  const merged = mergeTrees(
    commit.files,
    ours,
    parentFiles,
    `parent of ${shortOid(state, commit.oid)}`,
  );
  return finishApply(state, merged, ours, clock, {
    kind: 'revert',
    head: state.head,
    branch: state.branch,
    incoming: commit.oid,
    incomingName: shortOid(state, commit.oid),
    message: revertMessage(commit),
    parents: undefined,
  });
}

function finishApply(
  state: RepoState,
  merged: TreeMerge,
  ours: Record<string, string>,
  clock: Clock,
  pending: {
    kind: 'merge' | 'revert';
    head: string;
    branch: string;
    incoming: string;
    incomingName: string;
    message: string;
    parents: string[] | undefined;
  },
): CommandResult {
  const placed = checkoutTree(state, merged.files, pending.kind === 'merge' ? 'merge' : 'switch');
  if ('error' in placed) {
    const extra = pending.kind === 'revert' ? '\nfatal: revert failed' : '';
    return commandFailure(state, `${placed.error}${extra}`);
  }

  if (merged.conflicts.length > 0) {
    const index = { ...placed.index };
    for (const conflict of merged.conflicts) {
      const kept = ours[conflict.path];
      if (kept === undefined) delete index[conflict.path];
      else index[conflict.path] = kept;
    }
    const next = withDirs({
      ...state,
      index,
      worktree: placed.worktree,
      merge: {
        kind: pending.kind,
        head: pending.head,
        branch: pending.branch,
        incoming: pending.incoming,
        incomingName: pending.incomingName,
        message: pending.message,
        unmerged: merged.conflicts.map((conflict) => ({
          path: conflict.path,
          label: conflict.label,
        })),
        untracked: snapshotUntracked(state),
      },
    });
    const lines = [
      ...merged.automerged.map((path) => `Auto-merging ${path}`),
      ...merged.conflicts.map((conflict) => conflict.message),
      'Automatic merge failed; fix conflicts and then commit the result.',
    ];
    return { state: next, output: commandOutput(`${lines.join('\n')}\n`, '', 1) };
  }

  if (pending.kind === 'revert' && recordsEqual(merged.files, ours)) {
    return { state, output: commandOutput('', 'nothing to commit, working tree clean\n', 1) };
  }

  const next = withDirs({
    ...state,
    index: placed.index,
    worktree: placed.worktree,
    merge: null,
  });
  const committed = commitIndex(
    next,
    pending.message,
    Math.floor(clock.now() / 1000),
    pending.parents,
  );
  if (pending.kind === 'merge') {
    const stat = formatDiffStat(ours, headFiles(committed.state));
    const auto = merged.automerged.map((path) => `Auto-merging ${path}`);
    const body = ["Merge made by the 'ort' strategy.", stat].filter((line) => line !== '');
    return { state: committed.state, output: commandOutput(`${[...auto, ...body].join('\n')}\n`) };
  }
  return { state: committed.state, output: commandOutput(`${committed.summary}\n`) };
}

function revertMessage(commit: CommitData): string {
  const subject = commit.message.split('\n')[0] ?? '';
  const title = subject.startsWith('Revert "') ? `Reapply "${subject}"` : `Revert "${subject}"`;
  return `${title}\n\nThis reverts commit ${commit.oid}.`;
}

function dirtyTracked(state: RepoState): string[] {
  const head = headFiles(state);
  const paths = new Set([...Object.keys(head), ...Object.keys(state.index)]);
  const dirty: string[] = [];
  for (const path of [...paths].sort()) {
    if (state.index[path] !== head[path] || state.worktree[path] !== head[path]) dirty.push(path);
  }
  return dirty;
}

function restoreSpec(
  state: RepoState,
  spec: string,
  staged: boolean,
  worktree: boolean,
): RepoState | { error: string } {
  const head = headFiles(state);
  const paths = [...new Set([...Object.keys(state.index), ...Object.keys(head)])].filter(
    (path) => spec === '.' || path === spec || isInside(path, spec),
  );
  if (paths.length === 0) {
    return { error: `error: pathspec '${spec}' did not match any file(s) known to git` };
  }
  const index = { ...state.index };
  const files = { ...state.worktree };
  if (staged) {
    for (const path of paths) {
      const content = head[path];
      if (content === undefined) delete index[path];
      else index[path] = content;
    }
  }
  if (worktree) {
    for (const path of paths) {
      const content = index[path];
      if (content === undefined) delete files[path];
      else files[path] = content;
    }
  }
  return { ...state, index, worktree: files };
}

function mixedNote(index: Record<string, string>, worktree: Record<string, string>): string {
  const lines: string[] = [];
  for (const path of Object.keys(index).sort()) {
    if (worktree[path] === index[path]) continue;
    lines.push(path in worktree ? `M\t${path}` : `D\t${path}`);
  }
  if (lines.length === 0) return '';
  return `Unstaged changes after reset:\n${lines.join('\n')}\n`;
}

function parseRevertArgs(args: readonly string[]):
  | { abort: boolean; continue: boolean; mainline: number | null; commit: string | null }
  | {
      error: string;
      code?: number;
    } {
  let abort = false;
  let continueRevert = false;
  let mainline: number | null = null;
  let commit: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '--abort') {
      abort = true;
      continue;
    }
    if (arg === '--continue') {
      continueRevert = true;
      continue;
    }
    if (arg === '-m' || arg === '--mainline') {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value)) return { error: 'fatal: -m precisa de um número.', code: 128 };
      mainline = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--mainline=')) {
      const value = Number(arg.slice('--mainline='.length));
      if (!Number.isInteger(value)) return { error: 'fatal: -m precisa de um número.', code: 128 };
      mainline = value;
      continue;
    }
    if (arg.startsWith('-')) return { error: `error: unknown option '${arg}'` };
    if (commit) return { error: 'fatal: revert aceita um commit nesta trilha.', code: 128 };
    commit = arg;
  }
  if ((abort || continueRevert) && (commit || mainline !== null)) {
    return { error: 'fatal: --abort e --continue não levam revisão.', code: 128 };
  }
  if (abort && continueRevert)
    return { error: 'fatal: --abort e --continue juntos não valem.', code: 128 };
  return { abort, continue: continueRevert, mainline, commit };
}

export function abortKind(state: RepoState, kind: 'merge' | 'revert'): CommandResult {
  if (state.merge?.kind !== kind) {
    const message =
      kind === 'merge'
        ? 'fatal: There is no merge to abort (MERGE_HEAD missing).'
        : 'fatal: no revert in progress';
    return commandFailure(state, message, 128);
  }
  const next = abortPending(state);
  if (!next)
    return commandFailure(state, 'fatal: There is no merge to abort (MERGE_HEAD missing).', 128);
  return { state: next, output: commandOutput() };
}

export function operationInProgress(state: RepoState): CommandResult {
  if (state.merge?.unmerged.length) {
    return commandFailure(state, 'error: you need to resolve your current index first', 128);
  }
  return commandFailure(
    state,
    'error: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge.',
    128,
  );
}

export function applyMergeResult(
  state: RepoState,
  merged: TreeMerge,
  ours: Record<string, string>,
  clock: Clock,
  pending: {
    kind: 'merge' | 'revert';
    head: string;
    branch: string;
    incoming: string;
    incomingName: string;
    message: string;
    parents: string[] | undefined;
  },
): CommandResult {
  return finishApply(state, merged, ours, clock, pending);
}
