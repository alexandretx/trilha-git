import type { Clock } from '../../core/types';
import { splitArgs } from './args';
import { performCommit } from './commit';
import { formatDiffStat, mergeTrees } from './diff';
import { applyMergeResult, operationInProgress } from './history-ops';
import { headFiles, withDirs, type RepoState } from './repo';
import { commandFailure, commandOutput, type CommandResult } from './result';
import {
  isAncestorOrSelf,
  mergeBase,
  resolveRevision,
  shortOid,
  validBranchName,
} from './revisions';
import { abortPending, checkoutTree } from './worktree';

export function runBranch(state: RepoState, args: string[]): CommandResult {
  const { flags, rest } = splitArgs(args);
  let remove: 'keep' | 'safe' | 'force' = 'keep';
  for (const flag of flags) {
    if (flag === '-d' || flag === '--delete') remove = remove === 'force' ? 'force' : 'safe';
    else if (flag === '-D') remove = 'force';
    else if (flag === '--list') continue;
    else return commandFailure(state, `error: unknown option '${flag}'`);
  }
  if (remove !== 'keep') return deleteBranches(state, rest, remove === 'force');
  if (rest.length === 0) return listBranches(state);
  if (rest.length > 2) {
    return commandFailure(state, 'git branch aceita um nome e, se quiser, um ponto de partida.');
  }
  return createBranch(state, rest[0] ?? '', rest[1] ?? 'HEAD');
}

export function runSwitch(state: RepoState, args: string[]): CommandResult {
  return changeBranch(state, args, 'switch');
}

export function runCheckout(state: RepoState, args: string[]): CommandResult {
  return changeBranch(state, args, 'checkout');
}

export function runMerge(state: RepoState, args: string[], clock: Clock): CommandResult {
  const { flags, rest } = splitArgs(args);
  let abort = false;
  let continueMerge = false;
  for (const flag of flags) {
    if (flag === '--abort') abort = true;
    else if (flag === '--continue') continueMerge = true;
    else return commandFailure(state, `error: unknown option '${flag}'`);
  }
  if (abort && continueMerge) {
    return commandFailure(state, 'fatal: --abort e --continue juntos não valem.', 128);
  }
  if (abort) return abortMerge(state);
  if (continueMerge) {
    if (state.merge?.kind !== 'merge') {
      return commandFailure(
        state,
        'fatal: There is no merge in progress (MERGE_HEAD missing).',
        128,
      );
    }
    return performCommit(state, [], clock);
  }
  if (rest.length !== 1) return commandFailure(state, 'fatal: no branch specified.', 128);
  if (state.merge) return operationInProgress(state);
  if (!state.head) {
    return commandFailure(state, 'fatal: your current branch does not have any commits yet', 128);
  }

  const name = rest[0] ?? '';
  const incoming = resolveIncoming(state, name);
  if ('error' in incoming) return commandFailure(state, incoming.error, incoming.code ?? 1);
  if (incoming.oid === state.head) return { state, output: commandOutput('Already up to date.\n') };

  const base = mergeBase(state, state.head, incoming.oid);
  if (!base) return commandFailure(state, 'fatal: refusing to merge unrelated histories', 128);
  if (base === incoming.oid) return { state, output: commandOutput('Already up to date.\n') };
  if (base === state.head) return fastForward(state, incoming.oid);

  const ours = headFiles(state);
  const theirs = state.commits[incoming.oid]?.files ?? {};
  const baseFiles = state.commits[base]?.files ?? {};
  const merged = mergeTrees(baseFiles, ours, theirs, incoming.label);
  const message = incoming.branch
    ? `Merge branch '${incoming.label}'`
    : `Merge commit '${incoming.label}'`;
  return applyMergeResult(state, merged, ours, clock, {
    kind: 'merge',
    head: state.head,
    branch: state.branch,
    incoming: incoming.oid,
    incomingName: incoming.label,
    message,
    parents: [state.head, incoming.oid],
  });
}

function resolveIncoming(
  state: RepoState,
  name: string,
): { oid: string; label: string; branch: boolean } | { error: string; code?: number } {
  if (Object.prototype.hasOwnProperty.call(state.branches, name)) {
    const tip = state.branches[name];
    if (!tip) return { error: `merge: ${name} - not something we can merge` };
    return { oid: tip, label: name, branch: true };
  }
  const resolved = resolveRevision(state, name);
  if ('error' in resolved) return { error: `merge: ${name} - not something we can merge` };
  return { oid: resolved.oid, label: shortOid(state, resolved.oid), branch: false };
}

function fastForward(state: RepoState, oid: string): CommandResult {
  if (!state.head) return commandFailure(state, 'fatal: bad revision', 128);
  const files = state.commits[oid]?.files ?? {};
  const placed = checkoutTree(state, files, 'merge');
  if ('error' in placed) return commandFailure(state, placed.error);
  const before = headFiles(state);
  const next = withDirs({
    ...state,
    head: oid,
    branches: { ...state.branches, [state.branch]: oid },
    index: placed.index,
    worktree: placed.worktree,
    merge: null,
  });
  const stat = formatDiffStat(before, files);
  const lines = [
    `Updating ${shortOid(state, state.head)}..${shortOid(next, oid)}`,
    'Fast-forward',
    stat,
  ].filter((line) => line !== '');
  return { state: next, output: commandOutput(`${lines.join('\n')}\n`) };
}

function abortMerge(state: RepoState): CommandResult {
  if (state.merge?.kind !== 'merge') {
    return commandFailure(state, 'fatal: There is no merge to abort (MERGE_HEAD missing).', 128);
  }
  const next = abortPending(state);
  if (!next) {
    return commandFailure(state, 'fatal: There is no merge to abort (MERGE_HEAD missing).', 128);
  }
  return { state: next, output: commandOutput() };
}

function listBranches(state: RepoState): CommandResult {
  const names = Object.entries(state.branches)
    .filter((entry) => entry[1])
    .map(([name]) => name)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  if (names.length === 0) return { state, output: commandOutput() };
  const lines = names.map((name) => `${name === state.branch ? '* ' : '  '}${name}`);
  return { state, output: commandOutput(`${lines.join('\n')}\n`) };
}

function createBranch(state: RepoState, name: string, start: string): CommandResult {
  if (!validBranchName(name)) {
    return commandFailure(state, `fatal: '${name}' is not a valid branch name.`, 128);
  }
  if (Object.prototype.hasOwnProperty.call(state.branches, name)) {
    return commandFailure(state, `fatal: a branch named '${name}' already exists`, 128);
  }
  const resolved = resolveRevision(state, start);
  if ('error' in resolved) {
    if (start === 'HEAD')
      return commandFailure(state, "fatal: not a valid object name: 'HEAD'.", 128);
    return commandFailure(state, resolved.error, 128);
  }
  return {
    state: { ...state, branches: { ...state.branches, [name]: resolved.oid } },
    output: commandOutput(),
  };
}

function deleteBranches(state: RepoState, names: readonly string[], force: boolean): CommandResult {
  if (names.length === 0) return commandFailure(state, 'fatal: branch name required', 128);
  let next = state;
  const lines: string[] = [];
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(next.branches, name)) {
      return commandFailure(next, `error: branch '${name}' not found.`);
    }
    if (name === next.branch) {
      return commandFailure(
        next,
        `error: cannot delete branch '${name}' used by worktree at '/repo'`,
      );
    }
    const tip = next.branches[name] ?? null;
    const merged = tip !== null && next.head !== null && isAncestorOrSelf(next, tip, next.head);
    if (!force && !merged) {
      return commandFailure(
        next,
        `error: the branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`,
      );
    }
    const branches = { ...next.branches };
    delete branches[name];
    next = { ...next, branches };
    lines.push(`Deleted branch ${name} (was ${tip ? shortOid(next, tip) : 'not a commit'}).`);
  }
  return { state: next, output: commandOutput(`${lines.join('\n')}\n`) };
}

function changeBranch(
  state: RepoState,
  args: string[],
  mode: 'switch' | 'checkout',
): CommandResult {
  if (state.merge) return operationInProgress(state);
  const { flags, rest } = splitArgs(args);
  let create = false;
  for (const flag of flags) {
    const creates =
      (mode === 'switch' && (flag === '-c' || flag === '--create')) ||
      (mode === 'checkout' && flag === '-b');
    if (creates) create = true;
    else return commandFailure(state, `error: unknown option '${flag}'`);
  }
  const name = rest[0];
  if (!name) {
    const message =
      mode === 'switch'
        ? 'fatal: missing branch or commit argument'
        : 'fatal: you must specify a branch';
    return commandFailure(state, message, 128);
  }
  if (rest.length > (create ? 2 : 1))
    return commandFailure(state, 'fatal: too many arguments', 128);

  if (create) {
    if (!validBranchName(name)) {
      return commandFailure(state, `fatal: '${name}' is not a valid branch name.`, 128);
    }
    if (Object.prototype.hasOwnProperty.call(state.branches, name)) {
      return commandFailure(state, `fatal: a branch named '${name}' already exists`, 128);
    }
    const start = rest[1] ?? 'HEAD';
    const resolved = resolveRevision(state, start);
    if ('error' in resolved) {
      if (start === 'HEAD') {
        return commandFailure(state, "fatal: not a valid object name: 'HEAD'.", 128);
      }
      return commandFailure(state, resolved.error, 128);
    }
    const preview: RepoState = {
      ...state,
      branches: { ...state.branches, [name]: resolved.oid },
    };
    const switched = switchTo(preview, name, true);
    if (switched.output.exitCode !== 0) {
      return commandFailure(state, switched.output.stderr, switched.output.exitCode);
    }
    return switched;
  }

  if (!Object.prototype.hasOwnProperty.call(state.branches, name)) {
    const resolved = resolveRevision(state, name);
    if (!('error' in resolved)) {
      return commandFailure(
        state,
        `fatal: a branch is expected, got commit '${shortOid(state, resolved.oid)}'`,
        128,
      );
    }
    return commandFailure(state, `fatal: invalid reference: ${name}`, 128);
  }
  if (name === state.branch) return { state, output: commandOutput(`Already on '${name}'\n`) };
  return switchTo(state, name, false);
}

function switchTo(state: RepoState, name: string, created: boolean): CommandResult {
  const tip = state.branches[name];
  if (!tip) return commandFailure(state, `fatal: invalid reference: ${name}`, 128);
  const placed = checkoutTree(state, state.commits[tip]?.files ?? {}, 'switch');
  if ('error' in placed) return commandFailure(state, placed.error);
  const next = withDirs({
    ...state,
    branch: name,
    head: tip,
    index: placed.index,
    worktree: placed.worktree,
  });
  const label = created ? 'a new branch' : 'branch';
  return { state: next, output: commandOutput(`Switched to ${label} '${name}'\n`) };
}
