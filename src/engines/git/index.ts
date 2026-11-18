import type { Clock, Engine } from '../../core/types';
import { GitSession } from './session';
import { systemClock, type GitInitialState, type RepoState } from './repo';

export const gitEngine: Engine<RepoState, GitInitialState> = {
  id: 'git',
  createSession(initial, clock?: Clock) {
    return new GitSession(initial, clock ?? systemClock);
  },
};

export { gradeGit, gitGrader, type GitCheck } from './grade';
export { GitSession } from './session';
export { systemClock, type CommitData, type GitInitialState, type RepoState } from './repo';
export { AUTHOR, TIMEZONE } from './objects';
