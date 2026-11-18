import { gitEngine, gitGrader } from '../engines/git';
import { pack } from './registry';

if (gitEngine.id !== pack.engineId) {
  throw new Error(`Engine ${gitEngine.id} does not match pack ${pack.engineId}.`);
}

export const engine = gitEngine;
export const grader = gitGrader;
