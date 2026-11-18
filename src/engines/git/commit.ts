import type { Clock } from '../../core/types';
import { commandFailure, commandOutput, type CommandResult } from './result';
import { commitIndex, headFiles, recordsEqual, type RepoState } from './repo';

export function performCommit(state: RepoState, args: string[], clock: Clock): CommandResult {
  if (state.merge && state.merge.unmerged.length > 0) {
    return commandFailure(
      state,
      [
        'error: Committing is not possible because you have unmerged files.',
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
        'hint: as appropriate to mark resolution and make a commit.',
        'fatal: Exiting because of an unresolved conflict.',
      ].join('\n'),
      128,
    );
  }

  const parsed = parseCommitArgs(args);
  if ('error' in parsed) return commandFailure(state, parsed.error);
  let message = parsed.message;
  if (message === null && state.merge) message = state.merge.message;
  if (message === null) {
    return commandFailure(state, 'falta a mensagem do commit. Use git commit -m "mensagem".');
  }
  if (message.trim() === '') return commandFailure(state, 'a mensagem do commit está vazia.');

  let next = state;
  if (parsed.all) {
    const index = { ...next.index };
    for (const path of Object.keys(index)) {
      if (path in next.worktree) index[path] = next.worktree[path] ?? '';
      else delete index[path];
    }
    next = { ...next, index };
  }

  const merging = next.merge?.kind === 'merge';
  const head = headFiles(next);
  if (!merging && recordsEqual(next.index, head)) {
    const untracked = Object.keys(next.worktree).filter((path) => !(path in next.index));
    const dirty = Object.keys(next.index).some((path) => next.index[path] !== next.worktree[path]);
    if (!dirty && untracked.length > 0) {
      return {
        state,
        output: commandOutput(
          '',
          'nothing added to commit but untracked files present (use "git add" to track)\n',
          1,
        ),
      };
    }
    if (dirty) {
      return {
        state,
        output: commandOutput(
          '',
          'no changes added to commit (use "git add" and/or "git commit -a")\n',
          1,
        ),
      };
    }
    return { state, output: commandOutput('', 'nothing to commit, working tree clean\n', 1) };
  }

  if (merging && !next.head) {
    return commandFailure(state, 'fatal: cannot commit a merge without HEAD', 128);
  }
  const parents = merging && next.merge && next.head ? [next.head, next.merge.incoming] : undefined;
  const committed = commitIndex(
    { ...next, merge: null },
    message,
    Math.floor(clock.now() / 1000),
    parents,
  );
  return { state: committed.state, output: commandOutput(`${committed.summary}\n`) };
}

function parseCommitArgs(
  args: string[],
): { all: boolean; message: string | null } | { error: string } {
  let all = false;
  const messages: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '-a' || arg === '--all') {
      all = true;
      continue;
    }
    if (arg === '-am') {
      all = true;
      const message = args[index + 1];
      if (message === undefined) return { error: 'falta a mensagem depois de -am.' };
      messages.push(message);
      index += 1;
      continue;
    }
    if (arg === '-m' || arg === '--message') {
      const message = args[index + 1];
      if (message === undefined) return { error: 'falta a mensagem depois de -m.' };
      messages.push(message);
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) return { error: `error: unknown option '${arg}'` };
    return { error: `git commit não aceita o argumento "${arg}". Use -m "mensagem".` };
  }
  return { all, message: messages.length > 0 ? messages.join('\n\n') : null };
}
