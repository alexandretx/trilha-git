import { headFiles, withDirs, type RepoState } from './repo';

export function snapshotUntracked(state: RepoState): Record<string, string> {
  const current = headFiles(state);
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(state.worktree)) {
    if (!(path in current) && !(path in state.index)) files[path] = content;
  }
  return files;
}

function listBlock(paths: readonly string[]): string {
  return [...paths]
    .sort()
    .map((path) => `\t${path}`)
    .join('\n');
}

function checkoutError(
  paths: readonly string[],
  reason: 'switch' | 'merge',
  kind: 'local' | 'untracked',
): string {
  const verb = reason === 'merge' ? 'merge' : 'checkout';
  const hint = reason === 'merge' ? 'before you merge.' : 'before you switch branches.';
  if (kind === 'untracked') {
    return [
      `error: The following untracked working tree files would be overwritten by ${verb}:`,
      listBlock(paths),
      `Please move or remove them before you ${reason === 'merge' ? 'merge' : 'switch branches'}.`,
      'Aborting',
    ].join('\n');
  }
  return [
    `error: Your local changes to the following files would be overwritten by ${verb}:`,
    listBlock(paths),
    `Please commit your changes or stash them ${hint}`,
    'Aborting',
  ].join('\n');
}

export function checkoutTree(
  state: RepoState,
  nextFiles: Record<string, string>,
  reason: 'switch' | 'merge',
): { index: Record<string, string>; worktree: Record<string, string> } | { error: string } {
  const current = headFiles(state);
  const overwritten: string[] = [];
  const untrackedBlocked: string[] = [];
  const paths = new Set<string>([
    ...Object.keys(current),
    ...Object.keys(nextFiles),
    ...Object.keys(state.index),
    ...Object.keys(state.worktree),
  ]);

  for (const path of paths) {
    const headHas = path in current;
    const nextHas = path in nextFiles;
    const headContent = current[path];
    const nextContent = nextFiles[path];
    if (headHas === nextHas && headContent === nextContent) continue;

    const indexHas = path in state.index;
    const workHas = path in state.worktree;
    const untracked = workHas && !headHas && !indexHas;
    if (untracked && nextHas && state.worktree[path] !== nextContent) {
      untrackedBlocked.push(path);
      continue;
    }

    const indexValue = indexHas ? state.index[path] : undefined;
    const workValue = workHas ? state.worktree[path] : undefined;
    const headValue = headHas ? headContent : undefined;
    const nextValue = nextHas ? nextContent : undefined;
    if (indexValue !== headValue && indexValue !== nextValue) overwritten.push(path);
    else if (workValue !== headValue && workValue !== nextValue) overwritten.push(path);
  }

  if (untrackedBlocked.length > 0) {
    return { error: checkoutError(untrackedBlocked, reason, 'untracked') };
  }
  if (overwritten.length > 0) {
    return { error: checkoutError(overwritten, reason, 'local') };
  }

  const index: Record<string, string> = {};
  const worktree: Record<string, string> = {};
  for (const path of paths) {
    const headHas = path in current;
    const nextHas = path in nextFiles;
    const same = headHas === nextHas && current[path] === nextFiles[path];
    if (same) {
      if (path in state.index) index[path] = state.index[path] ?? '';
      if (path in state.worktree) worktree[path] = state.worktree[path] ?? '';
      continue;
    }
    if (nextHas) {
      index[path] = nextFiles[path] ?? '';
      worktree[path] = nextFiles[path] ?? '';
    }
  }
  return { index, worktree };
}

export function resetHardTree(
  state: RepoState,
  nextFiles: Record<string, string>,
  revision: string,
): { index: Record<string, string>; worktree: Record<string, string> } | { error: string } {
  const current = headFiles(state);
  const blocked: string[] = [];
  for (const path of Object.keys(nextFiles)) {
    const tracked = path in current || path in state.index;
    if (!tracked && path in state.worktree && state.worktree[path] !== nextFiles[path]) {
      blocked.push(path);
    }
  }
  if (blocked.length > 0) {
    return {
      error: [
        'error: The following untracked working tree files would be overwritten by reset:',
        listBlock(blocked),
        `fatal: Could not reset index file to revision '${revision}'.`,
      ].join('\n'),
    };
  }
  const worktree: Record<string, string> = { ...nextFiles };
  for (const [path, content] of Object.entries(state.worktree)) {
    if (!(path in nextFiles) && !(path in current) && !(path in state.index))
      worktree[path] = content;
  }
  return { index: { ...nextFiles }, worktree };
}

export function abortPending(state: RepoState): RepoState | null {
  const pending = state.merge;
  if (!pending) return null;
  const files = { ...(state.commits[pending.head]?.files ?? {}) };
  const unmerged = new Set(pending.unmerged.map((entry) => entry.path));
  const worktree: Record<string, string> = { ...files, ...pending.untracked };
  for (const [path, content] of Object.entries(state.worktree)) {
    if (path in files || path in state.index || unmerged.has(path)) continue;
    worktree[path] = content;
  }
  return withDirs({
    ...state,
    head: pending.head,
    branch: pending.branch,
    branches: { ...state.branches, [pending.branch]: pending.head },
    index: files,
    worktree,
    merge: null,
  });
}
