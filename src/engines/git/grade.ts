import type { GradeResult, Grader } from '../../core/types';
import { headFiles, history, recordsEqual, type RepoState } from './repo';

export type GitCheck =
  | { op: 'initialized'; value: boolean; fail: string }
  | { op: 'branch'; name: string; fail: string }
  | { op: 'commitCount'; count: number; fail: string }
  | { op: 'headMessageIncludes'; text: string; fail: string }
  | { op: 'rootMessageIncludes'; text: string; fail: string }
  | { op: 'clean'; fail: string }
  | { op: 'indexMatchesHead'; fail: string }
  | { op: 'worktreeMatchesIndex'; fail: string }
  | { op: 'headFile'; path: string; content: string; fail: string }
  | { op: 'headLacks'; path: string; fail: string }
  | { op: 'staged'; path: string; content: string; fail: string }
  | { op: 'notInIndex'; path: string; fail: string }
  | { op: 'worktree'; path: string; content: string; fail: string }
  | { op: 'untracked'; path: string; fail: string }
  | { op: 'ran'; prefix: readonly string[]; fail: string };

function includesText(message: string, text: string): boolean {
  return message.toLowerCase().includes(text.toLowerCase());
}

function rootCommit(state: RepoState) {
  const commits = history(state);
  return commits[commits.length - 1];
}

export function gradeGit(
  state: RepoState,
  checks: readonly GitCheck[],
  historyArg: readonly string[][],
): GradeResult {
  const failures: string[] = [];
  for (const check of checks) {
    const failure = evaluate(state, check, historyArg);
    if (failure) failures.push(failure);
  }
  return { passed: failures.length === 0, failures };
}

function evaluate(state: RepoState, check: GitCheck, ran: readonly string[][]): string | null {
  const head = headFiles(state);
  const commits = history(state);
  switch (check.op) {
    case 'initialized':
      return state.initialized === check.value ? null : check.fail;
    case 'branch':
      return state.branch === check.name ? null : check.fail;
    case 'commitCount':
      return commits.length === check.count ? null : check.fail;
    case 'headMessageIncludes':
      return commits[0] && includesText(commits[0].message, check.text) ? null : check.fail;
    case 'rootMessageIncludes': {
      const root = rootCommit(state);
      return root && includesText(root.message, check.text) ? null : check.fail;
    }
    case 'clean':
      return recordsEqual(state.worktree, state.index) && recordsEqual(state.index, head)
        ? null
        : check.fail;
    case 'indexMatchesHead':
      return recordsEqual(state.index, head) ? null : check.fail;
    case 'worktreeMatchesIndex': {
      const tracked = Object.keys(state.index).every(
        (path) => state.worktree[path] === state.index[path],
      );
      return tracked ? null : check.fail;
    }
    case 'headFile':
      return head[check.path] === check.content ? null : check.fail;
    case 'headLacks':
      return !(check.path in head) ? null : check.fail;
    case 'staged':
      return state.index[check.path] === check.content ? null : check.fail;
    case 'notInIndex':
      return !(check.path in state.index) ? null : check.fail;
    case 'worktree':
      return state.worktree[check.path] === check.content ? null : check.fail;
    case 'untracked':
      return check.path in state.worktree && !(check.path in state.index) ? null : check.fail;
    case 'ran':
      return ran.some((argv) => prefixMatches(argv, check.prefix)) ? null : check.fail;
    default:
      return 'verificação desconhecida.';
  }
}

function prefixMatches(argv: readonly string[], prefix: readonly string[]): boolean {
  return prefix.every((part, index) => argv[index] === part);
}

export const gitGrader: Grader<RepoState, GitCheck> = {
  grade: gradeGit,
};
